/**
 * POST /api/wa-hook?k=<secret>
 *
 * Evolution API's webhook. Records an inbound WhatsApp message so the studio
 * sees it in the admin rather than only on a phone.
 *
 * This endpoint is public — Evolution posts from a GCP box, not from the site,
 * so sameOrigin() cannot guard it. The shared secret in the query string is
 * what stops anyone POSTing invented enquiries into the database, and
 * firestore.rules pins the shape so a bypass writes bounded junk rather than
 * whatever it likes.
 *
 * It does NOT reply. Auto-answering every inbound message is an outbound
 * pattern, and outbound patterns are what get unofficial WhatsApp clients
 * banned. Replies are a decision to make deliberately, per conversation.
 */
import { clean, readJson } from "./_lib.js";
import { firebaseConfig } from "../firebase/config.js";

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

  try {
    const r = await fetch(COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{ update: { name: DOC + waId, fields }, currentDocument: { exists: false } }],
      }),
    });
    // A duplicate is a success from our side: the row is already there.
    if (!r.ok) {
      const e = await r.text().catch(() => "");
      if (!/ALREADY_EXISTS|already exists/i.test(e)) {
        console.error("[wa-hook] firestore", r.status, e.slice(0, 200));
      }
    }
  } catch (e) {
    console.error("[wa-hook]", e.message);
  }

  // Always 200. Evolution retries anything else, and a retry storm against a
  // 1 GB box is worse than a dropped message.
  return res.status(200).json({ ok: true });
}
