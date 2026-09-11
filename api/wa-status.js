/**
 * GET /api/wa-status?k=<secret>
 *
 * Asks the Evolution box how it is doing and answers in plain JSON, so the
 * question "is WhatsApp still connected?" can be settled from a browser
 * address bar instead of an SSH session. Everything it reports is also
 * console.logged, which puts it in Vercel's runtime logs where it can be read
 * remotely — the thing that made the VM-side worker impossible to debug.
 *
 * Add &send=<phone>&text=<message> to push one test message through the same
 * call api/wa-hook.js uses for auto-replies. That separates the two halves of
 * the pipeline: if a test send lands but an auto-reply doesn't, the problem is
 * inbound (Evolution isn't firing the webhook); if the test send fails too,
 * the problem is outbound and this says exactly why.
 *
 * Same shared secret as wa-hook. Read-only apart from that one opt-in send,
 * which is capped in length and needs an explicit number.
 */
const EVOLUTION_URLS = [
  process.env.EVOLUTION_URL,
  "https://wa.brandmintstudios.in",
  "http://34.63.145.168:8080",
].filter(Boolean);
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "brandmint whatsapp";

/** Node's fetch reports every network failure as the single word "fetch
 *  failed" and hides the reason on a non-enumerable .cause. */
const why = (e) => [e?.message, e?.cause?.code, e?.cause?.message].filter(Boolean).join(" / ");

async function call(base, path, init) {
  const r = await fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY, ...(init?.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await r.text().catch(() => "");
  let json = null;
  try { json = JSON.parse(body); } catch { /* Evolution answers HTML on some errors */ }
  return { status: r.status, json, body: json ? null : body.slice(0, 400) };
}

export default async function handler(req, res) {
  const secret = process.env.WA_HOOK_SECRET;
  if (!secret || req.query?.k !== secret) return res.status(401).json({ error: "no" });

  const out = {
    at: new Date().toISOString(),
    configured: {
      EVOLUTION_API_KEY: EVOLUTION_API_KEY ? "set" : "MISSING",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "set" : "MISSING",
      instance: EVOLUTION_INSTANCE,
      urls: EVOLUTION_URLS,
    },
    reachable: null,
    instances: null,
    tried: [],
  };

  // Whichever URL answers first is the live route; the VM's external IP is
  // ephemeral, so which one that is matters and is worth recording.
  for (const base of EVOLUTION_URLS) {
    try {
      const r = await call(base, "/instance/fetchInstances", { method: "GET" });
      out.reachable = base;
      out.instances = (Array.isArray(r.json) ? r.json : [r.json]).filter(Boolean).map((i) => {
        const n = i.instance || i;
        return {
          name: n.instanceName || n.name,
          state: n.connectionStatus || n.state || n.status,
          owner: n.ownerJid || n.owner,
        };
      });
      if (!r.json) out.instances = { status: r.status, body: r.body };
      break;
    } catch (e) {
      out.tried.push(`${base} -> ${why(e)}`);
    }
  }

  // The webhook's own event subscription. Evolution only posts the events
  // named here, so a subscription missing MESSAGES_UPSERT delivers connection
  // churn perfectly while dropping every actual message — which looks exactly
  // like a dead box from the receiving end.
  if (out.reachable) {
    try {
      const r = await call(out.reachable, `/webhook/find/${encodeURIComponent(EVOLUTION_INSTANCE)}`, { method: "GET" });
      out.webhook = r.json || { status: r.status, body: r.body };
    } catch (e) {
      out.webhook = { error: why(e) };
    }
  }

  // &fixwebhook=1 re-subscribes to the events this site actually needs.
  if (req.query?.fixwebhook && out.reachable) {
    const url = `https://www.brandmintstudios.in/api/wa-hook?k=${secret}`;
    const events = ["MESSAGES_UPSERT"];
    // v2 wraps the settings in a `webhook` object; older builds take them
    // flat and reject the wrapped form, so try one and fall back to the other.
    for (const payload of [{ webhook: { enabled: true, url, webhookByEvents: false, webhookBase64: false, events } },
                           { enabled: true, url, webhook_by_events: false, events }]) {
      try {
        const r = await call(out.reachable, `/webhook/set/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        out.fixWebhook = { status: r.status, ok: r.status >= 200 && r.status < 300, detail: r.json || r.body };
        if (out.fixWebhook.ok) break;
      } catch (e) {
        out.fixWebhook = { ok: false, error: why(e) };
      }
    }
  }

  const to = String(req.query?.send || "").replace(/\D/g, "");
  if (to && out.reachable) {
    const text = String(req.query?.text || "Brand Mint test message").slice(0, 200);
    try {
      const r = await call(out.reachable, `/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
        method: "POST",
        body: JSON.stringify({ number: to, text }),
      });
      out.testSend = { to, status: r.status, ok: r.status >= 200 && r.status < 300, detail: r.json || r.body };
    } catch (e) {
      out.testSend = { to, ok: false, error: why(e) };
    }
  }

  console.log("[wa-status]", JSON.stringify(out).slice(0, 2000));
  return res.status(200).json(out);
}
