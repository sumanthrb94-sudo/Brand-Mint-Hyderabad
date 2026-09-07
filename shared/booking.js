/**
 * Save a call request straight to Firestore, with no SDK.
 *
 * The landing page deliberately loads no Firebase — pulling ~150 KB of SDK
 * onto a marketing page for one write would be indefensible. So this posts to
 * the Firestore REST API exactly the way shared/analytics.js does.
 *
 * This runs BEFORE the email in api/book.js, on purpose: the record must
 * survive an email provider that is down, misconfigured, or not signed up for
 * yet. An enquiry that exists only in an email that failed to send is a lost
 * customer, and you never find out.
 *
 * firestore.rules pins the shape and size of what can be written here, and
 * lets nobody but an admin read it back.
 */
import { firebaseConfig, isConfigured } from "/firebase/config.js";

const ENDPOINT = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit?key=${firebaseConfig.apiKey}`;
const DOC = `projects/${firebaseConfig.projectId}/databases/(default)/documents/bookings/`;

function rid(n = 20) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += a[b % a.length];
  return s;
}

const str = (v, max) => ({ stringValue: String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max) });

/** Returns true if the row was stored. Never throws — the caller still emails. */
export async function saveBooking({ name, phone, email, service, when, note }) {
  if (!isConfigured()) return false;
  const fields = {
    name: str(name, 80),
    phone: str(phone, 20),
    email: str(email, 320),
    service: str(service, 60),
    when: str(when, 60),
    note: str(note, 1000),
    source: str("Site — booking form", 60),
    status: str("new", 20),
    createdAt: str(new Date().toISOString(), 40),
  };
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{ update: { name: DOC + rid(), fields }, currentDocument: { exists: false } }],
      }),
      keepalive: true,
    });
    return r.ok;
  } catch {
    return false;
  }
}
