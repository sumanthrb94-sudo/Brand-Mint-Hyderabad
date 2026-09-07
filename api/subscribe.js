/**
 * POST /api/subscribe  { email, name, source }
 *
 * Called right after Google sign-in. Adds the person to the Resend audience
 * and sends them the free toolkit. Never throws back at the browser: the
 * sign-in must succeed even if the mailing list is down or not configured
 * yet, so every failure here is logged and answered with 200.
 */
import { sameOrigin, readEmail, clean, readJson, addContact, sendEmail, shell } from "./_lib.js";

const FILES = [
  ["Store launch-readiness checklist", "/downloads/brand-mint-launch-readiness-checklist.pdf"],
  ["Product catalogue template (PDF)", "/downloads/brand-mint-product-catalogue-template.pdf"],
  ["Product catalogue template (CSV)", "/downloads/brand-mint-product-catalogue-template.csv"],
  ["Scope worksheet", "/downloads/brand-mint-scope-worksheet.pdf"],
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "bad origin" });

  const body = await readJson(req);
  const email = readEmail(body.email);
  if (!email) return res.status(400).json({ error: "valid email required" });
  const name = clean(body.name, 80);
  const marketing = body.newsletter !== false;
  const site = "https://brandmintstudios.in";

  const out = { ok: true, contact: null, welcome: null };
  try {
    // Someone who didn't tick the newsletter still goes in the audience, but
    // flagged unsubscribed — so they can be emailed about their own project
    // and never marketed to. Consent is recorded, not assumed.
    out.contact = await addContact({ email, name, unsubscribed: !marketing });
  } catch (e) {
    console.error("[subscribe] contact", e.message);
    out.contact = { error: e.message };
  }

  try {
    const links = FILES.map(
      ([label, path]) =>
        `<li style="margin-bottom:8px"><a href="${site}${path}" style="color:#047857;font-weight:600">${label}</a></li>`
    ).join("");
    out.welcome = await sendEmail({
      to: email,
      subject: "Your free store toolkit — Brand Mint",
      html: shell(
        name ? `Thanks, ${name.split(" ")[0]}.` : "Thanks for signing in.",
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a423e">
           Here is everything we promised, free and yours to keep whether or not you ever work with us.
         </p>
         <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.6">${links}</ul>
         <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a423e">
           Want the free store audit or the 30-minute review? Reply to this email, or message us on WhatsApp and we will get it moving.
         </p>
         <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a423e">
           Everything else you signed in for — your project, the readiness quiz, the compliance checklist — is in your portal.
         </p>
         <a href="${site}/portal" style="display:inline-block;background:#10b981;color:#05140f;font-weight:700;font-size:15px;text-decoration:none;padding:12px 20px;border-radius:10px">Open your portal</a>`,
        marketing
          ? `You are on our list because you ticked the box when you signed in. Reply "stop" any time and you are off it.`
          : `You are not on our marketing list — this is a one-off email for the files you asked for.`
      ),
    });
  } catch (e) {
    console.error("[subscribe] welcome", e.message);
    out.welcome = { error: e.message };
  }

  return res.status(200).json(out);
}
