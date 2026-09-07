/**
 * POST /api/book  { name, email, phone, service, when, note }
 *
 * The booking form. Emails the studio so a call can actually be made, and
 * confirms to the person that a human has it. The enquiry is also written to
 * Firestore by the browser when the visitor is signed in; this endpoint is
 * the part that reaches a human who is not looking at the admin.
 */
import { sameOrigin, readEmail, clean, readJson, sendEmail, shell, addContact } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "bad origin" });

  const body = await readJson(req);
  const name = clean(body.name, 80);
  const email = readEmail(body.email);
  const phone = clean(body.phone, 20);
  const service = clean(body.service, 60);
  const when = clean(body.when, 60);
  const note = clean(body.note, 1000);
  // Honeypot, checked here as well: the browser is not a trustworthy place to
  // enforce anything. A filled trap gets a 200 so the bot learns nothing.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });
  if (!name || !phone) return res.status(400).json({ error: "name and phone required" });

  const studio = process.env.BOOKING_TO || "mintstudios823@gmail.com";
  const row = (k, v) =>
    v ? `<tr><td style="padding:6px 14px 6px 0;color:#5b625e;font-size:13px;white-space:nowrap">${k}</td><td style="padding:6px 0;font-size:14px;font-weight:600">${v}</td></tr>` : "";

  const out = { ok: true };
  try {
    out.studio = await sendEmail({
      to: studio,
      replyTo: email || undefined,
      subject: `Call request — ${name}${service ? " · " + service : ""}`,
      html: shell(
        "Someone wants a call",
        `<table style="border-collapse:collapse;margin-bottom:18px">
           ${row("Name", name)}${row("Phone", phone)}${row("Email", email || "")}
           ${row("Interested in", service)}${row("Best time", when)}
         </table>
         ${note ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a423e"><strong>What they said:</strong><br />${note}</p>` : ""}
         <a href="https://wa.me/${phone.replace(/\D/g, "").replace(/^(?=\d{10}$)/, "91")}" style="display:inline-block;background:#10b981;color:#05140f;font-weight:700;font-size:15px;text-decoration:none;padding:12px 20px;border-radius:10px">WhatsApp them now</a>`,
        "Sent by the booking form on brandmintstudios.in"
      ),
    });
  } catch (e) {
    console.error("[book] studio", e.message);
    out.studio = { error: e.message };
    // If the studio can't be told, the booking hasn't happened. Say so.
    return res.status(502).json({ error: "could not send", detail: e.message });
  }

  if (email) {
    try {
      await addContact({ email, name, unsubscribed: true });
      out.confirm = await sendEmail({
        to: email,
        subject: "We have your call request — Brand Mint",
        html: shell(
          `Thanks, ${name.split(" ")[0]}.`,
          `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a423e">
             We have your request and will call you on <strong>${phone}</strong> within one working day${when ? `, aiming for ${when}` : ""}.
           </p>
           <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a423e">
             It is a thirty-minute conversation, not a pitch. We will tell you what it costs, how long it takes, and whether you need us at all.
           </p>
           <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a423e">
             In a hurry? Message us on WhatsApp and we will pick it up sooner.
           </p>
           <a href="https://wa.me/917799934943" style="display:inline-block;background:#10b981;color:#05140f;font-weight:700;font-size:15px;text-decoration:none;padding:12px 20px;border-radius:10px">WhatsApp us</a>`,
          "You are getting this because you asked us to call. You are not on our marketing list."
        ),
      });
    } catch (e) {
      console.error("[book] confirm", e.message);
    }
  }
  return res.status(200).json(out);
}
