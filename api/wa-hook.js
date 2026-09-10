/**
 * POST /api/wa-hook?k=<secret>
 *
 * Evolution API's webhook. Records an inbound WhatsApp message, generates an
 * automated response via Gemini API, and sends it back.
 *
 * This endpoint is public but guarded by a shared secret in the query string.
 * Firestore rules pin the shape so writes are bounded.
 */
import { clean, readJson } from "./_lib.js";
import { firebaseConfig } from "../firebase/config.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EVOLUTION_API_HOST = process.env.EVOLUTION_API || "https://wa.brandmintstudios.in";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

const SYSTEM_PROMPT = `You are Brand Mint Studios, a web and app development studio in India.

SERVICES:
- Static Website (₹14,999): Branded landing page, fast, SEO-ready
- Online Store (from ₹49,999): Full e-commerce with payments, inventory, orders
- Site + CRM (₹79,999 setup + ₹9,999/month): Website + customer management + WhatsApp API
- Custom CRM: Tailored business management system
- Modcon HR: HR management software

TONE: Professional, helpful, solution-focused. Answer questions about services, pricing, and timelines.
GUIDELINES:
- Be concise (under 100 words)
- No sensitive data (bank details, personal info)
- Direct booking/inquiry questions to: contact@brandmintstudios.com
- Don't make promises, suggest a call: "Shall we discuss your needs?"
- Always end with a CTA (call, email, or website)

Respond helpfully to: "What do you do?", "How much?", "Can you build X?", "Timeline?"`;


const COMMIT = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit?key=${firebaseConfig.apiKey}`;
const DOC = `projects/${firebaseConfig.projectId}/databases/(default)/documents/waMessages/`;

const str = (v, max) => ({ stringValue: clean(v, max) });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const secret = process.env.WA_HOOK_SECRET;
  if (!secret || req.query?.k !== secret) return res.status(401).json({ error: "no" });

  const body = await readJson(req);

  // Evolution fires on everything — connection state, presence, receipts,
  // our own sent messages. Only inbound one-to-one messages are enquiries;
  // anything else is answered 200 and dropped, or the volume is thousands of
  // rows a day for nothing. A non-2xx would make Evolution retry it forever.
  const drop = (why) => res.status(200).json({ ignored: why });
  if (body.event !== "messages.upsert") return drop("event");

  const d = body.data || {};
  const jid = d.key?.remoteJid || "";
  if (d.key?.fromMe) return drop("outbound");
  if (!jid.endsWith("@s.whatsapp.net")) return drop("group or status");

  const m = d.message || {};
  const text =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    (m.imageMessage ? "[image]" : "") ||
    (m.audioMessage ? "[voice note]" : "") ||
    (m.documentMessage ? "[document]" : "");
  if (!text) return drop("no text");

  // The WhatsApp message id becomes the document id, so Evolution retrying a
  // delivery writes the same row rather than a duplicate. currentDocument
  // exists:false makes the second attempt fail harmlessly.
  const waId = String(d.key?.id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  if (!waId) return drop("no id");

  const fields = {
    from: str(jid.split("@")[0], 20),
    name: str(d.pushName || "", 80),
    text: str(text, 2000),
    waId: str(waId, 64),
    instance: str(body.instance || "", 40),
    status: str("new", 20),
    createdAt: str(new Date().toISOString(), 40),
  };

  // Store message in Firestore
  try {
    const r = await fetch(COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{ update: { name: DOC + waId, fields }, currentDocument: { exists: false } }],
      }),
    });
    if (!r.ok) {
      const e = await r.text().catch(() => "");
      if (!/ALREADY_EXISTS|already exists/i.test(e)) {
        console.error("[wa-hook] firestore", r.status, e.slice(0, 200));
      }
    }
  } catch (e) {
    console.error("[wa-hook] firestore error:", e.message);
  }

  // Generate auto-reply via Gemini
  if (GEMINI_API_KEY) {
    try {
      const fromPhone = jid.split("@")[0];
      const fullPrompt = `${SYSTEM_PROMPT}\n\nUser message: ${text}\n\nRespond with a helpful reply.`;
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
          }),
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (reply) {
          // Send reply via Evolution API
          const headers = { "Content-Type": "application/json" };
          if (EVOLUTION_API_KEY) {
            headers["apiKey"] = EVOLUTION_API_KEY;
          }
          await fetch(`${EVOLUTION_API_HOST}/message/sendText/${body.instance}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              number: fromPhone,
              text: reply,
            }),
          }).catch(e => console.error("[wa-hook] evolution send error:", e.message));
        }
      } else {
        const errText = await geminiResponse.text().catch(() => "");
        console.error("[wa-hook] gemini:", geminiResponse.status, errText.slice(0, 300));
      }
    } catch (e) {
      console.error("[wa-hook] gemini error:", e.message);
    }
  }

  // Always 200. Evolution retries anything else.
  return res.status(200).json({ ok: true });
}
