/**
 * GET /api/wa-report   — the 08:30 IST daily health mail.
 *
 * Run by Vercel Cron (see `crons` in vercel.json, 03:00 UTC). It is deliberately
 * a cron and an email rather than something clever: the WhatsApp stack has
 * exactly one failure mode that matters, and it is silent. Evolution's session
 * dies, its database keeps reporting `open`, and nothing arrives — no error,
 * no bounce, just a phone that stops ringing. It went three days like that
 * once. This is the thing that notices.
 *
 * It asks Evolution directly rather than reading Firestore, because the studio
 * data is admin-only by design and this endpoint holds no Firebase Auth token.
 * Connection state is the thing worth waking up to anyway; the day's enquiries
 * are already in Admin -> Leads.
 */
import { clean, sendEmail, shell } from "./_lib.js";

const EVOLUTION_URLS = [
  process.env.EVOLUTION_URL,
  "https://wa.brandmintstudios.in",
  "http://34.63.145.168:8080",
].filter(Boolean);
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "brandmint whatsapp";
const SITE = "https://www.brandmintstudios.in";

const why = (e) => [e?.message, e?.cause?.code, e?.cause?.message].filter(Boolean).join(" / ");

async function evolution(path) {
  const tried = [];
  for (const base of EVOLUTION_URLS) {
    try {
      const r = await fetch(base + path, {
        headers: { apikey: EVOLUTION_API_KEY || "" },
        signal: AbortSignal.timeout(15_000),
      });
      const body = await r.text().catch(() => "");
      try {
        return { base, status: r.status, json: JSON.parse(body) };
      } catch {
        return { base, status: r.status, body: body.slice(0, 300) };
      }
    } catch (e) {
      tried.push(`${base} — ${why(e)}`);
    }
  }
  return { tried };
}

export default async function handler(req, res) {
  // Vercel's scheduler identifies itself; the shared secret covers a manual
  // run from a browser when someone wants the mail early.
  const secret = process.env.WA_HOOK_SECRET;
  const fromCron = !!req.headers?.["x-vercel-cron"];
  if (!fromCron && !(secret && req.query?.k === secret)) {
    return res.status(401).json({ error: "no" });
  }

  const state = await evolution(`/instance/connectionState/${encodeURIComponent(EVOLUTION_INSTANCE)}`);
  const live = state.json?.instance?.state || state.json?.state || "";
  const reachable = !!state.base;
  const healthy = live === "open";

  const repair = `${SITE}/api/wa-status?k=${secret}&repair=917799934943`;
  const status = `${SITE}/api/wa-status?k=${secret}`;

  const headline = healthy
    ? "WhatsApp auto-reply is running."
    : reachable
      ? `WhatsApp is NOT connected — state is "${clean(live, 40) || "unknown"}".`
      : "The Evolution server is unreachable.";

  // Only three things are ever worth doing about it, so only three are listed.
  const action = healthy
    ? `<p style="margin:0 0 8px">Nothing to do. Today's enquiries are in <a href="${SITE}/admin">Admin &rarr; Leads</a>.</p>`
    : reachable
      ? `<p style="margin:0 0 8px"><strong>Messages are not being received or answered right now.</strong></p>
         <p style="margin:0 0 8px">Put the phone on WhatsApp &rarr; Settings &rarr; Linked devices &rarr; Link a device &rarr; Link with phone number instead, <em>then</em> open this and type the code it shows:</p>
         <p style="margin:0 0 8px"><a href="${repair}">Re-pair WhatsApp</a></p>`
      : `<p style="margin:0 0 8px"><strong>Nothing can reach the Evolution server.</strong> Its external IP is ephemeral and has changed once before — if it has moved again, reserve a static IP in Google Cloud and update EVOLUTION_URL in Vercel.</p>
         <p style="margin:0 0 8px">Tried: ${clean((state.tried || []).join(" | "), 400) || "no addresses configured"}</p>`;

  const body = `
    <p style="margin:0 0 14px;font-size:16px;font-weight:600">${headline}</p>
    ${action}
    <table style="border-collapse:collapse;margin:18px 0 8px">
      <tr><td style="padding:5px 14px 5px 0;color:#5b625e;font-size:13px">Connection</td><td style="padding:5px 0;font-size:14px;font-weight:600">${clean(live, 40) || "unreachable"}</td></tr>
      <tr><td style="padding:5px 14px 5px 0;color:#5b625e;font-size:13px">Server</td><td style="padding:5px 0;font-size:14px">${clean(state.base || "—", 60)}</td></tr>
      <tr><td style="padding:5px 14px 5px 0;color:#5b625e;font-size:13px">Instance</td><td style="padding:5px 0;font-size:14px">${clean(EVOLUTION_INSTANCE, 40)}</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#5b625e">Full status any time: <a href="${status}">wa-status</a></p>`;

  const out = { ok: true, healthy, live, reachable, base: state.base || null };
  try {
    out.mail = await sendEmail({
      to: process.env.BOOKING_TO || "mintstudios823@gmail.com",
      subject: healthy ? "WhatsApp: all good" : `WhatsApp needs attention — ${clean(live, 20) || "server unreachable"}`,
      html: shell(healthy ? "Daily WhatsApp check" : "WhatsApp needs attention", body),
    });
  } catch (e) {
    console.error("[wa-report] mail:", why(e));
    out.mail = "failed";
  }

  console.log("[wa-report]", JSON.stringify(out).slice(0, 500));
  return res.status(200).json(out);
}
