/**
 * POST /api/wa-hook?k=<secret>
 *
 * Evolution API's webhook. Records an inbound WhatsApp message, drafts a
 * reply via Gemini, and — within a per-contact daily cap and a short random
 * delay to avoid looking bot-paced — sends it back automatically through
 * Evolution. This runs 24/7, no business-hours gate. Once a contact hits the
 * daily cap the draft is still generated and stored, but the send is left to
 * a human from Admin → Leads (same "Open chat (draft ready)" flow as before),
 * so a long conversation doesn't loop forever unattended.
 *
 * This endpoint is public but guarded by a shared secret in the query string.
 * Firestore rules pin the shape so writes are bounded.
 */
import { clean, readJson } from "./_lib.js";
import { firebaseConfig } from "../firebase/config.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || "http://34.63.145.168:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.EVO_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "brandmint";
const AUTOSEND_DAILY_CAP = parseInt(process.env.WA_AUTOSEND_DAILY_CAP || "5", 10);

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
const bool = (v) => ({ booleanValue: !!v });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const COUNTER_DOC = (id) =>
  `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/waAutoSendCounters/${id}?key=${firebaseConfig.apiKey}`;

/** How many auto-sends this contact has already had today. Best-effort: a
 *  missed race under real-world (low) message volume just means one extra
 *  send, not a security issue — this is a pacing guard, not an auth boundary. */
async function sendsToday(phone) {
  const day = new Date().toISOString().slice(0, 10);
  const docId = `${phone}_${day}`;
  try {
    const r = await fetch(COUNTER_DOC(docId));
    if (!r.ok) return { docId, count: 0 };
    const doc = await r.json();
    return { docId, count: parseInt(doc.fields?.count?.integerValue || "0", 10) };
  } catch {
    return { docId, count: 0 };
  }
}

async function bumpSends(docId, count) {
  try {
    await fetch(COUNTER_DOC(docId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: { count: { integerValue: String(count) }, updatedAt: str(new Date().toISOString(), 40) },
      }),
    });
  } catch (e) {
    console.error("[wa-hook] counter bump error:", e.message);
  }
}

/** Sends through Evolution. A short random delay before calling paces the
 *  reply like a person typing rather than a bot firing instantly. */
async function autoSend(phone, text) {
  if (!EVOLUTION_API_KEY) return false;
  await sleep(1000 + Math.random() * 1500);
  try {
    const r = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: phone, text }),
    });
    if (!r.ok) console.error("[wa-hook] evolution send:", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("[wa-hook] evolution send error:", e.message);
    return false;
  }
}

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

  let autoSent = false;
  let sentAt = "";
  if (suggestedReply) {
    const { docId, count } = await sendsToday(phone);
    if (count < AUTOSEND_DAILY_CAP) {
      autoSent = await autoSend(phone, suggestedReply);
      if (autoSent) {
        sentAt = new Date().toISOString();
        await bumpSends(docId, count + 1);
      }
    }
    // At or above the cap: draft stays in Firestore for a human to send
    // manually from Admin → Leads, same as before auto-send existed.
  }

  const fields = {
    from: str(phone, 20),
    name: str(d.pushName || "", 80),
    text: str(text, 2000),
    waId: str(waId, 64),
    instance: str(body.instance || "", 40),
    status: str(autoSent ? "done" : "new", 20),
    createdAt: str(new Date().toISOString(), 40),
    ...(suggestedReply ? { suggestedReply: str(suggestedReply, 1000) } : {}),
    ...(autoSent ? { autoSent: bool(true), sentAt: str(sentAt, 40) } : {}),
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
