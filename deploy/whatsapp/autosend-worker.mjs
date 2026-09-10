/**
 * Runs in its own container on the same docker network as Evolution (see
 * the `autosend` service in docker-compose.yml), on a 1-minute loop.
 *
 * api/wa-hook.js can't do the actual sending itself — a Vercel serverless
 * function is killed long before a human-paced, multi-minute delay would
 * elapse. So it just drafts the reply and stores a `sendAfter` timestamp;
 * this worker is the thing that actually waits and sends, because it runs
 * on a VM with no execution time limit.
 *
 * Talks to Evolution over the internal docker network (http://evolution:8080)
 * rather than the VM's public IP — more reliable, and doesn't depend on the
 * GCP firewall rule at all.
 */

const PROJECT_ID = "brandmintstudios-a5eb7";
const API_KEY = "AIzaSyBk1rF-GagRY_XIXfXdXq2ndXfI0hZc2KI";
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const EVOLUTION_API_KEY = process.env.EVO_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "brandmint";
const AUTOSEND_DAILY_CAP = parseInt(process.env.WA_AUTOSEND_DAILY_CAP || "5", 10);

const str = (v, max) => ({ stringValue: String(v ?? "").slice(0, max) });
const bool = (v) => ({ booleanValue: !!v });

async function dueMessages() {
  const now = new Date().toISOString();
  const r = await fetch(`${FIRESTORE}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "waMessages" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              { fieldFilter: { field: { fieldPath: "autoSendState" }, op: "EQUAL", value: { stringValue: "pending" } } },
              { fieldFilter: { field: { fieldPath: "sendAfter" }, op: "LESS_THAN_OR_EQUAL", value: { stringValue: now } } },
            ],
          },
        },
        limit: 25,
      },
    }),
  });
  if (!r.ok) {
    console.error("[autosend-worker] query failed:", r.status, await r.text().catch(() => ""));
    return [];
  }
  const rows = await r.json();
  return (rows || [])
    .filter((row) => row.document)
    .map((row) => ({
      id: row.document.name.split("/").pop(),
      from: row.document.fields.from?.stringValue || "",
      suggestedReply: row.document.fields.suggestedReply?.stringValue || "",
    }));
}

async function sendsToday(phone) {
  const day = new Date().toISOString().slice(0, 10);
  const docId = `${phone}_${day}`;
  try {
    const r = await fetch(`${FIRESTORE}/waAutoSendCounters/${docId}?key=${API_KEY}`);
    if (!r.ok) return { docId, count: 0 };
    const doc = await r.json();
    return { docId, count: parseInt(doc.fields?.count?.integerValue || "0", 10) };
  } catch {
    return { docId, count: 0 };
  }
}

async function bumpSends(docId, count) {
  await fetch(`${FIRESTORE}/waAutoSendCounters/${docId}?key=${API_KEY}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: { count: { integerValue: String(count) }, updatedAt: str(new Date().toISOString(), 40) },
    }),
  }).catch((e) => console.error("[autosend-worker] counter bump error:", e.message));
}

async function sendViaEvolution(phone, text) {
  if (!EVOLUTION_API_KEY) return false;
  try {
    const r = await fetch(`http://evolution:8080/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: phone, text }),
    });
    if (!r.ok) console.error("[autosend-worker] evolution send:", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("[autosend-worker] evolution send error:", e.message);
    return false;
  }
}

async function markMessage(id, patch) {
  const mask = Object.keys(patch).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  await fetch(`${FIRESTORE}/waMessages/${id}?key=${API_KEY}&${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: patch }),
  }).catch((e) => console.error("[autosend-worker] mark error:", e.message));
}

async function tick() {
  const due = await dueMessages();
  for (const msg of due) {
    if (!msg.from || !msg.suggestedReply) {
      await markMessage(msg.id, { autoSendState: str("skipped", 20) });
      continue;
    }
    const { docId, count } = await sendsToday(msg.from);
    if (count >= AUTOSEND_DAILY_CAP) {
      await markMessage(msg.id, { autoSendState: str("skipped", 20) });
      continue;
    }
    const ok = await sendViaEvolution(msg.from, msg.suggestedReply);
    if (ok) {
      await bumpSends(docId, count + 1);
      await markMessage(msg.id, {
        autoSendState: str("sent", 20),
        autoSent: bool(true),
        sentAt: str(new Date().toISOString(), 40),
        status: str("done", 20),
      });
      console.log(`[autosend-worker] sent to ${msg.from}`);
    } else {
      // Leave it pending — retried next tick rather than lost.
      console.error(`[autosend-worker] send failed for ${msg.from}, will retry`);
    }
  }
}

async function main() {
  console.log("[autosend-worker] started, polling every 60s");
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error("[autosend-worker] tick error:", e.message);
    }
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

main();
