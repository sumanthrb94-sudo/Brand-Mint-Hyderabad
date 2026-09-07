/**
 * Shared helpers for the two serverless functions.
 *
 * These run on Vercel's Node runtime, not in the browser. That is the whole
 * point: the Resend API key is a secret and must never reach the client, so
 * anything that sends email has to happen here.
 *
 * No npm packages on purpose — the repo has no build step and no
 * package.json, and everything below is Node built-ins plus global fetch.
 */

const RESEND = "https://api.resend.com";

/** Only accept calls from our own site. Not a security boundary on its own —
 *  a determined script can forge Origin — but it stops casual drive-by use. */
export function sameOrigin(req) {
  const allowed = [
    "https://brandmintstudios.in",
    "https://www.brandmintstudios.in",
    "https://brand-mint-sdmk.vercel.app",
  ];
  const origin = req.headers.origin || "";
  if (!origin) return true; // curl / server-to-server; validation still applies
  if (allowed.includes(origin)) return true;
  // Vercel preview deployments of this project.
  return /^https:\/\/brand-mint-sdmk-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

export function readEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  if (e.length < 5 || e.length > 320) return null;
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(e)) return null;
  return e;
}

export function clean(v, max = 200) {
  return String(v || "").trim().replace(/\s+/g, " ").slice(0, max);
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8").slice(0, 20_000);
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

async function resend(path, init) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: "RESEND_API_KEY not set" };
  const r = await fetch(RESEND + path, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.message || `Resend ${r.status}`);
  return body;
}

/** Add someone to the mailing list. Silently fine if no audience is set up. */
export async function addContact({ email, name, unsubscribed = false }) {
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (!audience) return { skipped: "RESEND_AUDIENCE_ID not set" };
  const [first, ...rest] = clean(name, 80).split(" ");
  return resend(`/audiences/${audience}/contacts`, {
    method: "POST",
    body: JSON.stringify({
      email,
      first_name: first || undefined,
      last_name: rest.join(" ") || undefined,
      unsubscribed,
    }),
  });
}

export async function sendEmail({ to, subject, html, replyTo }) {
  const from = process.env.RESEND_FROM;
  if (!from) return { skipped: "RESEND_FROM not set" };
  return resend("/emails", {
    method: "POST",
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
}

/** One plain, on-brand email shell. Inline styles — mail clients ignore <style>. */
export function shell(heading, bodyHtml, footNote = "") {
  return `<div style="margin:0;padding:24px;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0e0c">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(10,14,12,.12);border-radius:16px;padding:32px">
    <div style="font-size:15px;font-weight:700;letter-spacing:-.02em;margin-bottom:24px">
      Brand Mint <span style="color:#5b625e;font-weight:400;font-style:italic">— Hyderabad</span>
    </div>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.25">${heading}</h1>
    ${bodyHtml}
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(10,14,12,.12);font-size:12.5px;color:#5b625e">
      Brand Mint · HITEC City, Hyderabad · <a href="https://wa.me/917799934943" style="color:#047857">+91 77999 34943</a><br />
      ${footNote}
    </div>
  </div>
</div>`;
}
