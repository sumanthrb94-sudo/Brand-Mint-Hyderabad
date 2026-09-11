/**
 * POST /api/wa-hook?k=<secret>
 *
 * Evolution API's webhook. Records an inbound WhatsApp message, drafts a reply
 * with Gemini, waits a short human-paced beat, and sends the reply back through
 * Evolution's own HTTP API.
 *
 * The send used to live in a worker container on the Evolution VM so the delay
 * could be minutes long. That worker was the one piece of the chain that never
 * worked and it could not be debugged from here — nothing outside the VM can
 * read its logs. So the send moved back in here, where it runs on the same
 * request Vercel already logs, and the delay shrank to fit a function's budget
 * (WA_REPLY_DELAY_MS, default 40s; vercel.json gives this route maxDuration 60).
 *
 * This endpoint is public but guarded by a shared secret in the query string.
 * Firestore rules pin the shape so writes are bounded.
 */
import { clean, readJson } from "./_lib.js";
import { firebaseConfig } from "../firebase/config.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Evolution's own API. EVOLUTION_URL wins when set; otherwise both known ways
// in are tried in turn and the one that answers is logged, because the VM's
// external IP is ephemeral and the DNS record for it has gone stale before.
const EVOLUTION_URLS = [
  process.env.EVOLUTION_URL,
  "https://wa.brandmintstudios.in",
  "http://34.63.145.168:8080",
].filter(Boolean);
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
// The live instance is literally named "brandmint whatsapp", space included.
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "brandmint whatsapp";

const REPLY_DELAY_MS = parseInt(process.env.WA_REPLY_DELAY_MS || "40000", 10);
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

const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const COMMIT = `${FIRESTORE}:commit?key=${firebaseConfig.apiKey}`;
const DOC = `projects/${firebaseConfig.projectId}/databases/(default)/documents/waMessages/`;

const str = (v, max) => ({ stringValue: clean(v, max) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
            // gemini-flash-latest points at a thinking model, which spends the
            // output budget reasoning before it writes anything — at a low cap
            // it returns a candidate with no text and no error. The reply is a
            // short WhatsApp message; it needs no deliberation.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    if (!r.ok) {
      console.error("[wa-hook] gemini error:", r.status, await r.text().catch(() => ""));
      return "";
    }
    const data = await r.json();
    // Not `text` — that is this function's own parameter, and shadowing it
    // here puts the prompt's reference to it in the temporal dead zone.
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!reply) {
      console.error(
        "[wa-hook] gemini returned no text, finishReason=",
        data.candidates?.[0]?.finishReason,
        JSON.stringify(data).slice(0, 400)
      );
    }
    return reply;
  } catch (e) {
    console.error("[wa-hook] gemini error:", e.message);
    return "";
  }
}

/** Node's fetch reports every network-level failure as the single word
 *  "fetch failed" and hides the real reason (DNS, refused, TLS, timeout) on a
 *  non-enumerable .cause. Unwrapping it here is the difference between a
 *  diagnosable log line and three days of guessing. */
function why(e) {
  const c = e?.cause;
  return [e?.message, c?.code, c?.message].filter(Boolean).join(" / ");
}

async function sendViaEvolution(phone, text) {
  if (!EVOLUTION_API_KEY) return { ok: false, error: "EVOLUTION_API_KEY is not set in Vercel" };
  const path = `/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
  const errors = [];

  for (const base of EVOLUTION_URLS) {
    try {
      const r = await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone, text }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await r.text().catch(() => "");
      if (r.ok) {
        console.log("[wa-hook] sent via", base, r.status);
        return { ok: true, via: base };
      }
      // A reachable Evolution answering 4xx is a real answer, not a bad route —
      // trying the next URL would just get the same rejection.
      console.error("[wa-hook] evolution", base, r.status, body.slice(0, 300));
      return { ok: false, error: `${base} -> ${r.status} ${body.slice(0, 300)}` };
    } catch (e) {
      errors.push(`${base} -> ${why(e)}`);
    }
  }
  console.error("[wa-hook] evolution unreachable:", errors.join(" | "));
  return { ok: false, error: errors.join(" | ") };
}

async function sendsToday(phone) {
  const docId = `${phone}_${new Date().toISOString().slice(0, 10)}`;
  try {
    const r = await fetch(`${FIRESTORE}/waAutoSendCounters/${docId}?key=${firebaseConfig.apiKey}`);
    if (!r.ok) return { docId, count: 0 };
    const doc = await r.json();
    return { docId, count: parseInt(doc.fields?.count?.integerValue || "0", 10) };
  } catch {
    return { docId, count: 0 };
  }
}

async function bumpSends(docId, count) {
  await fetch(`${FIRESTORE}/waAutoSendCounters/${docId}?key=${firebaseConfig.apiKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: { count: { integerValue: String(count) }, updatedAt: str(new Date().toISOString(), 40) },
    }),
  }).catch((e) => console.error("[wa-hook] counter bump:", why(e)));
}

async function markSent(waId, patch) {
  const mask = Object.keys(patch).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const r = await fetch(
    `${FIRESTORE}/waMessages/${waId}?key=${firebaseConfig.apiKey}&${mask}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: patch }) }
  ).catch((e) => {
    console.error("[wa-hook] mark error:", why(e));
    return null;
  });
  if (r && !r.ok) console.error("[wa-hook] mark", r.status, (await r.text().catch(() => "")).slice(0, 200));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Evolution does not always deliver the query string intact — it has been
  // seen appending to the URL after the `?k=`, which leaves req.query.k
  // holding the secret plus a suffix and rejects a legitimate delivery. The
  // check is possession of the secret, so matching it anywhere in the request
  // URL is exactly as strong and survives that mangling. The 401 path logs the
  // URL because silent rejection is what made this invisible in the first
  // place.
  const secret = process.env.WA_HOOK_SECRET;
  const url = req.url || "";
  const header = req.headers?.["x-bm-key"];
  if (!secret || !(req.query?.k === secret || url.includes(`k=${secret}`) || header === secret)) {
    console.log("[wa-hook] 401 url=", url.slice(0, 200));
    return res.status(401).json({ error: "no" });
  }

  const body = await readJson(req);

  // Evolution fires on everything — connection state, presence, receipts,
  // our own sent messages. Only inbound one-to-one messages are enquiries;
  // anything else is answered 200 and dropped, or the volume is thousands of
  // rows a day for nothing. A non-2xx would make Evolution retry it forever.
  const drop = (why) => {
    // One line per ignored event. Evolution's traffic is otherwise invisible
    // here, and knowing whether the box is sending connection churn or real
    // messages is the difference between debugging this end and that end.
    console.log("[wa-hook] ignored:", why, "event=" + (body.event || "?"));
    return res.status(200).json({ ignored: why });
  };
  if (body.event !== "messages.upsert") return drop("event");

  const d = body.data || {};
  const jid = d.key?.remoteJid || "";
  // Without this the reply we just sent comes straight back in and answers
  // itself, forever.
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

  const fields = {
    from: str(phone, 20),
    name: str(d.pushName || "", 80),
    text: str(text, 2000),
    waId: str(waId, 64),
    instance: str(body.instance || "", 40),
    status: str("new", 20),
    createdAt: str(new Date().toISOString(), 40),
    // 'pending' is what the rules require on create, and it is also what makes
    // the row updatable later without a Firebase Auth token.
    ...(suggestedReply
      ? { suggestedReply: str(suggestedReply, 1000), autoSendState: str("pending", 20) }
      : {}),
  };

  let stored = false;
  try {
    const r = await fetch(COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{ update: { name: DOC + waId, fields }, currentDocument: { exists: false } }],
      }),
    });
    stored = r.ok;
    if (!r.ok) {
      const e = await r.text().catch(() => "");
      // A retried delivery losing the race is the expected path, not an error.
      if (/ALREADY_EXISTS|already exists/i.test(e)) return drop("duplicate");
      console.error("[wa-hook] firestore", r.status, e.slice(0, 300));
    }
  } catch (e) {
    console.error("[wa-hook] firestore error:", why(e));
  }

  if (!suggestedReply) {
    console.log("[wa-hook] no draft for", phone, "— nothing to send");
    return res.status(200).json({ ok: true, sent: false, reason: "no draft" });
  }

  const { docId, count } = await sendsToday(phone);
  if (count >= AUTOSEND_DAILY_CAP) {
    if (stored) await markSent(waId, { autoSendState: str("skipped", 20) });
    console.log(`[wa-hook] daily cap reached for ${phone} (${count}/${AUTOSEND_DAILY_CAP})`);
    return res.status(200).json({ ok: true, sent: false, reason: "daily cap" });
  }

  // Replying the instant a message lands reads as a bot to the person on the
  // other end, so hold the response for a beat first.
  await sleep(REPLY_DELAY_MS);

  const { ok, via, error } = await sendViaEvolution(phone, suggestedReply);
  if (ok) {
    await bumpSends(docId, count + 1);
    if (stored) {
      await markSent(waId, {
        autoSendState: str("sent", 20),
        autoSent: { booleanValue: true },
        sentAt: str(new Date().toISOString(), 40),
        status: str("done", 20),
      });
    }
  }

  // Always 200. Evolution retries anything else, and a retry here would mean
  // a second copy of the same reply.
  return res.status(200).json({ ok: true, sent: ok, via: via || null, error: error || null });
}
