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

  // fetchInstances reads connectionStatus out of Evolution's database, which
  // keeps saying 'open' long after the socket to WhatsApp has died. This asks
  // the instance itself, which is the state that actually decides whether a
  // message can be sent.
  if (out.reachable) {
    try {
      const r = await call(out.reachable, `/instance/connectionState/${encodeURIComponent(EVOLUTION_INSTANCE)}`, { method: "GET" });
      out.liveState = r.json?.instance || r.json || { status: r.status, body: r.body };
    } catch (e) {
      out.liveState = { error: why(e) };
    }
  }

  // &restart=1 drops and rebuilds the socket without unlinking the device, so
  // a session that is merely wedged recovers without a new QR scan. &connect=1
  // is the next step up: it returns a fresh pairing code or QR for a session
  // WhatsApp has actually logged out.
  if (req.query?.restart && out.reachable) {
    try {
      const r = await call(out.reachable, `/instance/restart/${encodeURIComponent(EVOLUTION_INSTANCE)}`, { method: "POST" });
      out.restart = { status: r.status, ok: r.status >= 200 && r.status < 300, detail: r.json || r.body };
    } catch (e) {
      out.restart = { ok: false, error: why(e) };
    }
  }
  // &create=<phone> builds the instance from nothing. After a database wipe
  // there is no instance to repair — Evolution has to be told to make one
  // before it can be paired, and doing it here keeps the whole recovery in
  // the browser instead of sending someone back to a terminal.
  const create = String(req.query?.create || "").replace(/\D/g, "");
  if (create && out.reachable) {
    try {
      const r = await call(out.reachable, "/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: EVOLUTION_INSTANCE,
          integration: "WHATSAPP-BAILEYS",
          qrcode: false,
          number: create,
          // Belt and braces: the container's global webhook should already
          // carry messages now, but an instance-level subscription costs
          // nothing and survives a change to the global config.
          webhook: {
            url: `https://www.brandmintstudios.in/api/wa-hook?k=${secret}`,
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT"],
          },
        }),
      });
      const j = r.json || {};
      out.create = { status: r.status, ok: r.status >= 200 && r.status < 300, detail: r.json ? null : r.body };
      // Creating with a number usually returns the pairing code directly; when
      // it doesn't, the connect call below picks it up.
      if (j.qrcode?.pairingCode || j.pairingCode) {
        out.connect = { status: r.status, pairingCode: j.qrcode?.pairingCode || j.pairingCode, hasQr: true, detail: null };
      }
    } catch (e) {
      out.create = { ok: false, error: why(e) };
    }
  }

  // &repair=<phone> is the whole re-pair in one request. Split across separate
  // URLs it doesn't work in practice: a pairing code expires in well under the
  // time it takes to read one response and open the next, and every expired
  // attempt spends another of WhatsApp's rate-limited device links.
  //
  // The logout is what makes it work at all. Connecting on top of credentials
  // WhatsApp has already revoked just resumes the same doomed retry loop —
  // the instance has to be emptied before it will ask for a new pairing.
  const repair = String(req.query?.repair || "").replace(/\D/g, "");
  if (repair && out.reachable) {
    out.repair = {};
    try {
      const r = await call(out.reachable, `/instance/logout/${encodeURIComponent(EVOLUTION_INSTANCE)}`, { method: "DELETE" });
      out.repair.logout = { status: r.status, ok: r.status >= 200 && r.status < 300 };
    } catch (e) {
      out.repair.logout = { ok: false, error: why(e) };
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  if ((req.query?.connect || repair || (create && !out.connect?.pairingCode)) && out.reachable) {
    try {
      // Without ?number Evolution answers with a QR image, which is no use in
      // a JSON response; with it, it answers with a code that can be typed in.
      const q = repair || create ? `?number=${repair || create}` : "";
      const r = await call(out.reachable, `/instance/connect/${encodeURIComponent(EVOLUTION_INSTANCE)}${q}`, { method: "GET" });
      const j = r.json || {};
      out.connect = {
        status: r.status,
        pairingCode: j.pairingCode || null,
        hasQr: !!(j.base64 || j.code),
        detail: j.pairingCode ? null : (r.body || JSON.stringify(j).slice(0, 300)),
      };
    } catch (e) {
      out.connect = { error: why(e) };
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

  // A pairing code is good for about a minute, and hunting for it inside a
  // wall of JSON burns most of that — then the expired attempt spends one of
  // WhatsApp's rate-limited device links. In a browser, show the code alone,
  // large, with the seconds ticking down.
  if (out.connect?.pairingCode && String(req.headers?.accept || "").includes("text/html")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pairing code</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;gap:24px;
       background:#0f1115;color:#f4f4f5;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}
  .code{font:700 clamp(40px,16vw,88px)/1 ui-monospace,SFMono-Regular,Menlo,monospace;
        letter-spacing:.12em;color:#4ade80;word-break:break-all}
  .t{font-size:14px;opacity:.7}
</style>
<div>
  <p class="t">Type this into WhatsApp &rarr; Linked devices &rarr; Link with phone number</p>
  <p class="code">${out.connect.pairingCode}</p>
  <p class="t">expires in <b id="s">60</b>s &middot; reload this page for a new one</p>
</div>
<script>
  let n = 60, el = document.getElementById("s");
  setInterval(() => { el.textContent = Math.max(0, --n); }, 1000);
</script>`);
  }

  return res.status(200).json(out);
}
