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
import crypto from "node:crypto";
import { clean, readJson } from "./_lib.js";
import { SYSTEM_PROMPT } from "./_wa-brain.js";
import { firebaseConfig } from "../firebase/config.js";

// How much of the conversation the model is shown. Long enough that it stops
// re-introducing itself and stops asking what it was already told; short
// enough that an old thread doesn't drown the message in front of it.
const MAX_TURNS = 12;

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
// Per contact, per day. This is a ban guard, not a cost guard — Evolution is
// an unofficial WhatsApp client and sustained automated replying is what gets
// a number cut off. 20 is past anything a real enquiry reaches while still
// stopping a loop that answers itself forever. Past the cap the draft still
// lands in Admin -> Leads for a human to send.
const AUTOSEND_DAILY_CAP = parseInt(process.env.WA_AUTOSEND_DAILY_CAP || "20", 10);

const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const COMMIT = `${FIRESTORE}:commit?key=${firebaseConfig.apiKey}`;
const DOC = `projects/${firebaseConfig.projectId}/databases/(default)/documents/waMessages/`;

const str = (v, max) => ({ stringValue: clean(v, max) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The conversation document id. Firestore rules here authenticate nobody —
 *  this endpoint writes with the public web key like every other server write
 *  in the project — so a document id of the phone number would put a customer's
 *  chat behind a guessable address. Hashing it with the shared secret makes the
 *  id unguessable without the secret, which is the same thing that guards the
 *  endpoint itself. */
const convoId = (phone, secret) =>
  crypto.createHash("sha256").update(`${phone}:${secret}`).digest("hex").slice(0, 40);

async function loadTurns(id) {
  try {
    const r = await fetch(`${FIRESTORE}/waConversations/${id}?key=${firebaseConfig.apiKey}`);
    if (!r.ok) return [];
    const doc = await r.json();
    const turns = JSON.parse(doc.fields?.turns?.stringValue || "[]");
    return Array.isArray(turns) ? turns.slice(-MAX_TURNS) : [];
  } catch {
    // No history is a valid state — it just means first contact.
    return [];
  }
}

async function saveTurns(id, turns) {
  const r = await fetch(
    `${FIRESTORE}/waConversations/${id}?key=${firebaseConfig.apiKey}` +
      "&updateMask.fieldPaths=turns&updateMask.fieldPaths=updatedAt",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          turns: str(JSON.stringify(turns.slice(-MAX_TURNS)), 8000),
          updatedAt: str(new Date().toISOString(), 40),
        },
      }),
    }
  ).catch((e) => {
    console.error("[wa-hook] convo save:", why(e));
    return null;
  });
  if (r && !r.ok) console.error("[wa-hook] convo save", r.status, (await r.text().catch(() => "")).slice(0, 200));
}

async function draftReply(text, turns = []) {
  if (!GEMINI_API_KEY) return "";
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          // Both sides of the thread, oldest first, then what they just said.
          // Without our own replies in here the model cannot tell a first
          // contact from a fifth message and greets everyone as a stranger.
          contents: [
            ...turns.map((t) => ({
              role: t.r === "a" ? "model" : "user",
              parts: [{ text: String(t.t || "").slice(0, 1000) }],
            })),
            { role: "user", parts: [{ text }] },
          ],
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
    // Evolution delivers each message through more than one path and only
    // some carry the secret. Without knowing which caller a rejection came
    // from, the fix is guesswork — so say who it was.
    console.log(
      "[wa-hook] 401 url=", url.slice(0, 200),
      "ua=", String(req.headers?.["user-agent"] || "").slice(0, 60),
      "x-bm-key=", header ? (header === secret ? "match" : "mismatch") : "absent",
      "keys=", Object.keys(req.query || {}).join(",") || "none"
    );
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

  const phone = jid.split("@")[0];
  const cid = convoId(phone, secret);

  // An outbound message is recorded and never answered. Answering it is how a
  // bot ends up talking to itself forever; discarding it is how it forgets it
  // ever spoke. Recording it also captures replies the studio types by hand
  // from the phone, so the model stays in step with a human who stepped in.
  if (d.key?.fromMe) {
    const turns = await loadTurns(cid);
    const last = turns[turns.length - 1];
    // Our own auto-reply arrives back through this webhook moments after we
    // save it below; recording it twice would double it in the history.
    if (!(last?.r === "a" && last.t === text)) {
      await saveTurns(cid, [...turns, { r: "a", t: text }]);
    }
    return drop("outbound recorded");
  }

  // The WhatsApp message id becomes the document id, so Evolution retrying a
  // delivery writes the same row rather than a duplicate. currentDocument
  // exists:false makes the second attempt fail harmlessly.
  const waId = String(d.key?.id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  if (!waId) return drop("no id");

  const turns = await loadTurns(cid);
  const suggestedReply = await draftReply(text, turns);

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
    await saveTurns(cid, [...turns, { r: "u", t: text }]);
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
  // Their message goes into the history either way; ours only if it was
  // actually delivered, so a failed send doesn't leave the model believing it
  // already answered.
  await saveTurns(cid, ok ? [...turns, { r: "u", t: text }, { r: "a", t: suggestedReply }]
                          : [...turns, { r: "u", t: text }]);
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
