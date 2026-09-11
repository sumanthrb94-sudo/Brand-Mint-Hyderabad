/**
 * POST /api/wa-hook?k=<secret>
 *
 * Evolution API's webhook. Records an inbound WhatsApp message and drafts a
 * reply via Gemini. It does NOT send anything itself — a Vercel serverless
 * function can't safely hold a request open for the ~60s send delay, so
 * sending has to happen somewhere with no execution time limit. Instead this
 * stores the draft with a `sendAfter` timestamp (now + ~50-70s), and a small
 * worker script running on the Evolution VM (deploy/whatsapp/
 * autosend-worker.mjs, on a 1-minute poll loop) sends it through Evolution's
 * local API once due. See that file for the daily-cap and send logic.
 *
 * This endpoint is public but guarded by a shared secret in the query string.
 * Firestore rules pin the shape so writes are bounded.
 */
import { clean, readJson } from "./_lib.js";
import { firebaseConfig } from "../firebase/config.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AUTOSEND_DELAY_MIN_MS = 50 * 1000;
const AUTOSEND_DELAY_MAX_MS = 70 * 1000;

const SYSTEM_PROMPT = `You are drafting a WhatsApp reply on behalf of Brand Mint Studios, a web and app development studio in India. A human will review your draft before sending it.

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

async function draftReply(text) {
  if (!GEMINI_API_KEY) return "";
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
        }),
      }
    );
    if (!r.ok) {
      console.error("[wa-hook] gemini error:", r.status, await r.text().catch(() => ""));
      return "";
    }
    const data = await r.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("[wa-hook] gemini error:", e.message);
    return "";
  }
}

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

  const phone = jid.split("@")[0];
  const suggestedReply = await draftReply(text);

  // The worker picks this up once sendAfter has passed. No suggestedReply
  // (Gemini unset/failed) means nothing to auto-send — the field is omitted
  // and the worker's query (which requires suggestedReply) never matches it.
  const sendAfter = suggestedReply
    ? new Date(Date.now() + AUTOSEND_DELAY_MIN_MS + Math.random() * (AUTOSEND_DELAY_MAX_MS - AUTOSEND_DELAY_MIN_MS)).toISOString()
    : "";

  const fields = {
    from: str(phone, 20),
    name: str(d.pushName || "", 80),
    text: str(text, 2000),
    waId: str(waId, 64),
    instance: str(body.instance || "", 40),
    status: str("new", 20),
    createdAt: str(new Date().toISOString(), 40),
    ...(suggestedReply
      ? { suggestedReply: str(suggestedReply, 1000), sendAfter: str(sendAfter, 40), autoSendState: str("pending", 20) }
      : {}),
  };

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

  // Always 200. Evolution retries anything else.
  return res.status(200).json({ ok: true });
}
