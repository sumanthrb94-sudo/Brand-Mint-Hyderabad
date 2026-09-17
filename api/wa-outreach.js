/**
 * GET /api/wa-outreach?k=<secret>
 *
 * The outbound half of the WhatsApp campaign. `wa-hook.js` answers people who
 * message us; this one opens the conversation with Hyderabad businesses that
 * have a Google listing and no website.
 *
 * It lives on Vercel rather than in scripts/ for one plain reason: the API
 * keys are Vercel env vars. A local script would need them copied onto a
 * laptop, and the laptop would have to stay awake all day for the pacing to
 * mean anything.
 *
 * Actions, all guarded by the same shared secret as the webhook:
 *
 *   (none) | &status=1   the dashboard. Open it in a browser.
 *   &find=1              fill the queue from the Google Places API. Chunked —
 *                        returns a cursor, the dashboard chains the calls.
 *   &seed=1  (POST)      paste a CSV or JSON array instead of searching.
 *   &tick=1              send at most ONE message, if everything below allows.
 *   &pause=1 &resume=1   stop / start the queue.
 *   &drop=<phone>        never contact this number again.
 *
 * Nothing here loops. One tick sends one message or nothing, and something
 * outside has to call it — a cron on the Evolution VM, every two minutes.
 * The tick being called often is fine and expected: the pacing lives in here,
 * not in the cron, so a missed minute or a double call changes nothing.
 *
 * The guards, in the order they are checked, because each one is a way to
 * lose the number rather than a preference:
 *   - paused
 *   - outside 10:00-19:00 IST, or a Sunday
 *   - less than WA_OUTREACH_GAP_MS (default 5 min, jittered) since the last
 *   - past WA_OUTREACH_DAILY_CAP (default 40) for the day
 *   - not a mobile number (a landline cannot receive WhatsApp at all)
 *   - we already have a conversation with them — so no second opener, ever,
 *     and no message to someone who once told us to stop
 *
 * There is no follow-up. If they do not reply, that is the answer.
 */
import crypto from "node:crypto";
import { clean, readJson } from "./_lib.js";
import { firebaseConfig } from "../firebase/config.js";

const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const KEY = `key=${firebaseConfig.apiKey}`;

const EVOLUTION_URLS = [
  process.env.EVOLUTION_URL,
  "https://wa.brandmintstudios.in",
  "http://34.63.145.168:8080",
].filter(Boolean);
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "brandmint whatsapp";

const GAP_MS = parseInt(process.env.WA_OUTREACH_GAP_MS || "300000", 10);
const DAILY_CAP = parseInt(process.env.WA_OUTREACH_DAILY_CAP || "40", 10);
const HOUR_FROM = parseInt(process.env.WA_OUTREACH_FROM_HOUR || "10", 10);
const HOUR_TO = parseInt(process.env.WA_OUTREACH_TO_HOUR || "19", 10);

const MAX_QUEUE = 600;
const MAX_LOG = 200;
const MAX_SEEN = 4000;

const str = (v, max) => ({ stringValue: clean(v, max) });

/** Node's fetch flattens every network failure to "fetch failed" and hides the
 *  reason on a non-enumerable .cause. Same unwrapper as the webhook. */
function why(e) {
  const c = e?.cause;
  return [e?.message, c?.code, c?.message].filter(Boolean).join(" / ");
}

/* ------------------------------- the store ------------------------------- */

/** One document holds the whole campaign: queue, log, counters, cursor.
 *  Its id is derived from the shared secret for the same reason the webhook
 *  hashes conversation ids — this endpoint writes with the public web API key,
 *  so an unguessable id is the only thing standing between a stranger and a
 *  list of four hundred phone numbers. */
const storeId = (secret) =>
  crypto.createHash("sha256").update(`outreach:${secret}`).digest("hex").slice(0, 40);

const blank = () => ({
  paused: false,
  day: "",
  sentToday: 0,
  nextAt: 0,
  cursor: 0,
  queue: [],
  log: [],
  seen: [],
});

async function load(id) {
  try {
    const r = await fetch(`${FIRESTORE}/outreach/${id}?${KEY}`);
    if (!r.ok) return blank();
    const doc = await r.json();
    const data = JSON.parse(doc.fields?.blob?.stringValue || "{}");
    return { ...blank(), ...data };
  } catch {
    return blank();
  }
}

async function save(id, state) {
  const trimmed = {
    ...state,
    queue: state.queue.slice(0, MAX_QUEUE),
    log: state.log.slice(0, MAX_LOG),
    seen: state.seen.slice(-MAX_SEEN),
  };
  const r = await fetch(
    `${FIRESTORE}/outreach/${id}?${KEY}&updateMask.fieldPaths=blob&updateMask.fieldPaths=updatedAt`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          blob: str(JSON.stringify(trimmed), 190_000),
          updatedAt: str(new Date().toISOString(), 40),
        },
      }),
    }
  ).catch((e) => {
    console.error("[wa-outreach] save:", why(e));
    return null;
  });
  if (r && !r.ok) console.error("[wa-outreach] save", r.status, (await r.text().catch(() => "")).slice(0, 300));
  return !!(r && r.ok);
}

/* --------------------------------- time ---------------------------------- */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** A Date shifted into IST, so getUTCHours() on it reads as the local hour.
 *  Vercel runs in UTC; every person in this campaign does not. */
const ist = (d = new Date()) => new Date(d.getTime() + IST_OFFSET_MS);
const dayKey = () => ist().toISOString().slice(0, 10);
const istClock = () => ist().toISOString().slice(11, 16);

function windowState() {
  const t = ist();
  const hour = t.getUTCHours();
  const dow = t.getUTCDay(); // 0 = Sunday
  if (dow === 0) return { open: false, reason: "Sunday" };
  if (hour < HOUR_FROM) return { open: false, reason: `before ${HOUR_FROM}:00 IST` };
  if (hour >= HOUR_TO) return { open: false, reason: `after ${HOUR_TO}:00 IST` };
  return { open: true, reason: "" };
}

/* -------------------------------- phones --------------------------------- */

/** WhatsApp needs a mobile. Google listings are full of landlines — an 040
 *  number is a business that exists, answers the phone and will never see a
 *  message. Returns 91XXXXXXXXXX or null. */
function mobile(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  if (ten.length !== 10) return null;
  if (!/^[6-9]/.test(ten)) return null; // landline or malformed
  return `91${ten}`;
}

/* ------------------------------- the message ------------------------------ */

/** Three ways to say the same first line. Not a trick — a hundred messages
 *  that are byte-identical is a fingerprint, and the whole campaign depends on
 *  looking like what it is: one person messaging one business at a time. */
const OPENERS = [
  "Hi {name} — I'm Sumanth from Brand Mint, a small web studio in HITEC City.",
  "Hello {name} — Sumanth here, from Brand Mint. We're a small web studio in HITEC City, Hyderabad.",
  "Hi {name} — this is Sumanth from Brand Mint, a web studio in HITEC City, Hyderabad.",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Praising three reviews reads as a script, which is the one thing that stops
 *  this working. Under ten, the sentence is dropped entirely. */
const reviewLine = (p) =>
  p.r >= 10
    ? ` You've got ${p.r} reviews, which is more than most ${p.c || "businesse"}s around ${p.a || "Hyderabad"}.`
    : "";

function compose(p) {
  const name = p.n || "there";
  const open = pick(OPENERS).replace("{name}", name);
  const what = p.c ? `${p.c}s` : "businesses";
  const where = p.a || "Hyderabad";

  if (p.s) {
    // Running off Instagram / Justdial. They already believe being findable
    // matters — the thing they have not thought about is who owns the page.
    return [
      open,
      "",
      `I found you on Google while looking at ${what} in ${where}, and saw the business runs off Instagram.${reviewLine(p)}`,
      "",
      "Worth knowing: that page isn't yours. A boutique I know ran off Instagram for two years, woke up to a locked account, and lost the photos, the prices and every customer conversation in one morning. There was nobody to appeal to.",
      "",
      "A site of your own is ₹14,999 — one time, domain in your name, live in two weeks. Less than one lost month of orders, and you keep posting on Instagram exactly as you do now.",
      "",
      "Want me to send two we've built so you can see? If not, just say stop and I won't message again.",
    ].join("\n");
  }

  return [
    open,
    "",
    `I was looking at ${what} in ${where} and yours came up on Google with no website.${reviewLine(p)}`,
    "",
    "Here's the thing that costs you and you never see it: someone searches, finds your listing, looks for your prices or timings, finds nothing, and calls the next one on the list. You don't get a missed call. You don't get anything.",
    "",
    "If that happens to even one customer a month, over a year it costs more than the website does once. A proper one is ₹14,999 — fixed price in writing before we start, live in two weeks, domain in your name.",
    "",
    "Want me to send two we've built so you can see? If not, just say stop and I won't message again.",
  ].join("\n");
}

/* ------------------------------- the sending ------------------------------ */

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
      if (r.ok) return { ok: true, via: base };
      // A reachable Evolution answering 4xx is a real answer, not a bad route.
      return { ok: false, error: `${base} -> ${r.status} ${body.slice(0, 200)}` };
    } catch (e) {
      errors.push(`${base} -> ${why(e)}`);
    }
  }
  return { ok: false, error: errors.join(" | ") };
}

/** The webhook's conversation id, recomputed here so the opener lands in the
 *  same history the reply brain reads. Without this the bot would greet them a
 *  second time the moment they answered, which is the tell. */
const convoId = (phone, secret) =>
  crypto.createHash("sha256").update(`${phone}:${secret}`).digest("hex").slice(0, 40);

async function hasConversation(cid) {
  try {
    const r = await fetch(`${FIRESTORE}/waConversations/${cid}?${KEY}`);
    if (!r.ok) return false;
    const doc = await r.json();
    const turns = JSON.parse(doc.fields?.turns?.stringValue || "[]");
    return Array.isArray(turns) && turns.length > 0;
  } catch {
    return false;
  }
}

async function seedConversation(cid, text) {
  await fetch(
    `${FIRESTORE}/waConversations/${cid}?${KEY}` +
      "&updateMask.fieldPaths=turns&updateMask.fieldPaths=updatedAt",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          turns: str(JSON.stringify([{ r: "a", t: text }]), 8000),
          updatedAt: str(new Date().toISOString(), 40),
        },
      }),
    }
  ).catch((e) => console.error("[wa-outreach] convo seed:", why(e)));
}

/* ----------------------------- finding prospects -------------------------- */

const PLACES = "https://places.googleapis.com/v1/places:searchText";
const FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress",
  "places.nationalPhoneNumber", "places.internationalPhoneNumber",
  "places.websiteUri", "places.userRatingCount",
  "places.primaryTypeDisplayName", "places.businessStatus",
].join(",");

/** A page on somebody else's platform is not a website — it is the exact
 *  prospect this campaign wants, and it gets the other message. */
const SOCIAL = /(instagram|facebook|fb\.me|justdial|jdmart|indiamart|linktr\.ee|wa\.me|business\.site|sites\.google|wixsite|blogspot|zomato|swiggy|practo|urbanpro)/i;

const CATEGORIES = [
  "boutique", "saree shop", "jewellery shop", "furniture shop",
  "interior designer", "event planner", "caterer", "bakery",
  "gym", "yoga studio", "salon", "spa",
  "dental clinic", "physiotherapy clinic", "coaching centre", "play school",
  "packers and movers", "printing press", "photographer", "travel agency",
  "pet shop", "hardware store", "auto parts shop", "tailor",
];
const AREAS = [
  "Madhapur Hyderabad", "Gachibowli Hyderabad", "Kondapur Hyderabad",
  "Kukatpally Hyderabad", "Miyapur Hyderabad", "Banjara Hills Hyderabad",
  "Jubilee Hills Hyderabad", "Begumpet Hyderabad", "Ameerpet Hyderabad",
  "Secunderabad", "Uppal Hyderabad", "LB Nagar Hyderabad",
  "Dilsukhnagar Hyderabad", "Kompally Hyderabad", "Manikonda Hyderabad",
  "Nizampet Hyderabad",
];
/** Category-major so an interrupted run still covers the whole city rather
 *  than four hundred boutiques in Madhapur. */
const PAIRS = [];
for (const c of CATEGORIES) for (const a of AREAS) PAIRS.push([c, a]);

function placesKey() {
  // GOOGLE_PLACES_KEY if it exists. Otherwise the Gemini key — an AI Studio
  // key is an ordinary Google Cloud API key, and if Places API (New) is
  // enabled on the same project and the key is unrestricted, it just works.
  // If it does not, the error says exactly which of those two to fix.
  return process.env.GOOGLE_PLACES_KEY || process.env.GEMINI_API_KEY || "";
}

async function searchPlaces(query, key) {
  const r = await fetch(PLACES, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELDS,
    },
    body: JSON.stringify({ textQuery: query, regionCode: "IN", maxResultCount: 20 }),
    signal: AbortSignal.timeout(12_000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(body?.error?.message || `Places ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return body.places || [];
}

async function findMore(state, target, budgetMs) {
  const key = placesKey();
  if (!key) return { added: 0, error: "No GOOGLE_PLACES_KEY and no GEMINI_API_KEY in Vercel.", done: false };

  const started = Date.now();
  const seen = new Set(state.seen);
  let added = 0;
  let error = "";

  while (state.cursor < PAIRS.length && Date.now() - started < budgetMs) {
    const [category, area] = PAIRS[state.cursor];
    state.cursor += 1;
    let places;
    try {
      places = await searchPlaces(`${category} in ${area}`, key);
    } catch (e) {
      error = String(e.message).slice(0, 300);
      // A key problem will not fix itself on the next pair — stop and report.
      if (/API_KEY|PERMISSION|not enabled|SERVICE_DISABLED|403|401/i.test(error)) break;
      continue;
    }
    for (const pl of places) {
      if (pl.businessStatus && pl.businessStatus !== "OPERATIONAL") continue;
      const site = pl.websiteUri || "";
      if (site && !SOCIAL.test(site)) continue; // already has a real site
      const phone = mobile(pl.nationalPhoneNumber || pl.internationalPhoneNumber);
      if (!phone) continue;                     // landline, or nothing to message
      if (seen.has(phone)) continue;
      seen.add(phone);
      state.seen.push(phone);
      state.queue.push({
        n: clean(pl.displayName?.text || "", 60),
        p: phone,
        c: clean(category, 30),
        a: clean(area.replace(/ Hyderabad$/, ""), 30),
        r: Number(pl.userRatingCount || 0),
        s: site ? 1 : 0,
        t: 0,
      });
      added += 1;
      if (state.queue.length >= target) break;
    }
    if (state.queue.length >= target) break;
  }
  return { added, error, done: state.cursor >= PAIRS.length };
}

/* --------------------------------- seeding -------------------------------- */

/** Splits one CSV line, honouring quotes and doubled quotes inside them. */
function cells(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Accepts the CSV that scripts/find-prospects.mjs writes, or a JSON array of
 *  {name, phone, category, area, reviews, currentPresence}. */
function parseSeed(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      return JSON.parse(text).map((o) => ({
        name: o.name, phone: o.phone, category: o.category,
        area: o.area, reviews: o.reviews, presence: o.currentPresence || o.presence,
      }));
    } catch { return []; }
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const head = cells(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const at = (row, name) => {
    const i = head.indexOf(name);
    return i === -1 ? "" : (row[i] || "").trim();
  };
  return lines.slice(1).map(cells).map((row) => ({
    name: at(row, "name"),
    phone: at(row, "phone"),
    category: at(row, "category"),
    area: at(row, "area"),
    reviews: at(row, "reviews") || at(row, "reviewcount"),
    presence: at(row, "currentpresence") || at(row, "presence"),
  }));
}

/* ------------------------------- the dashboard ---------------------------- */

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(state, extra = "") {
  const w = windowState();
  const waiting = Math.max(0, (state.nextAt || 0) - Date.now());
  const mins = Math.ceil(waiting / 60000);
  const today = state.day === dayKey() ? state.sentToday : 0;
  const rows = state.log.slice(0, 25).map((l) => `
    <tr><td>${esc(l.at)}</td>
    <td>${esc(l.n || "")}<span class="ph">${esc(l.p)}</span></td>
    <td class="${l.ok ? "ok" : "bad"}">${l.ok ? "sent" : esc(l.err || "failed")}</td></tr>`).join("");
  const next = state.queue[0];

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>Outreach — Brand Mint</title>
<style>
:root{color-scheme:light dark;--bg:#f5f1ea;--card:#fff;--ink:#0a0e0c;--mut:#5b625e;--line:rgba(10,14,12,.12);--go:#047857;--no:#b91c1c}
@media(prefers-color-scheme:dark){:root{--bg:#0a0e0c;--card:#121715;--ink:#f5f1ea;--mut:#9aa39e;--line:rgba(245,241,234,.14);--go:#34d399;--no:#f87171}}
*{box-sizing:border-box}body{margin:0;padding:24px 16px 48px;background:var(--bg);color:var(--ink);
font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
.wrap{max-width:720px;margin:0 auto}
h1{font-size:20px;letter-spacing:-.02em;margin:0 0 4px}
.sub{color:var(--mut);font-size:13px;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.tile b{display:block;font-size:26px;letter-spacing:-.03em;line-height:1.1}
.tile span{color:var(--mut);font-size:12.5px}
.bar{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:16px;font-size:14px}
.st{font-weight:600}.on{color:var(--go)}.off{color:var(--no)}
.acts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
button{font:inherit;font-size:14px;padding:10px 14px;border-radius:10px;border:1px solid var(--line);
background:var(--card);color:var(--ink);cursor:pointer}
button.p{background:var(--ink);color:var(--bg);border-color:var(--ink)}
button:disabled{opacity:.5;cursor:default}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:13px}
td{padding:9px 12px;border-top:1px solid var(--line);vertical-align:top}
tr:first-child td{border-top:0}
.ph{display:block;color:var(--mut);font-size:12px}
.ok{color:var(--go)}.bad{color:var(--no)}
pre{white-space:pre-wrap;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;font-size:13px;margin:0 0 16px}
.note{color:var(--mut);font-size:12.5px;margin-top:20px}
</style></head><body><div class="wrap">
<h1>Outreach queue</h1>
<p class="sub">Hyderabad businesses with a Google listing and no website · ${istClock()} IST</p>
${extra ? `<pre>${esc(extra)}</pre>` : ""}
<div class="grid">
  <div class="tile"><b>${state.queue.length}</b><span>waiting</span></div>
  <div class="tile"><b>${today}<small style="font-size:14px;color:var(--mut)">/${DAILY_CAP}</small></b><span>sent today</span></div>
  <div class="tile"><b>${state.seen.length}</b><span>found so far</span></div>
</div>
<div class="bar">
  <div class="st ${state.paused ? "off" : w.open ? "on" : "off"}">${
    state.paused ? "Paused" : w.open ? "Running" : `Asleep — ${esc(w.reason)}`
  }</div>
  <div style="color:var(--mut);font-size:13px;margin-top:4px">${
    state.paused ? "Nothing goes out until you resume."
      : waiting > 0 ? `Next send in about ${mins} minute${mins === 1 ? "" : "s"}.`
      : w.open ? "Ready — the next tick sends." : `Resumes at ${HOUR_FROM}:00 IST.`
  }<br>${
    next ? `Up next: ${esc(next.n)} — ${esc(next.c)}, ${esc(next.a)}.` : "Queue is empty."
  }</div>
</div>
<div class="acts">
  <button class="p" onclick="go('find=1')">Find more businesses</button>
  <button onclick="go('tick=1&amp;force=1')">Send one now</button>
  <button onclick="go('${state.paused ? "resume=1" : "pause=1"}')">${state.paused ? "Resume" : "Pause"}</button>
  <button onclick="location.reload()">Refresh</button>
</div>
${rows ? `<table>${rows}</table>` : `<p class="sub">Nothing sent yet.</p>`}
<p class="note">One message at a time, about ${Math.round(GAP_MS / 60000)} minutes apart, ${HOUR_FROM}:00–${HOUR_TO}:00 IST, Monday to Saturday.
No follow-ups — if someone doesn't reply, that is the answer. Anyone who says stop is dropped by the webhook and never messaged again.</p>
</div><script>
const q = new URLSearchParams(location.search);
async function go(action){
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  const base = location.pathname + '?k=' + encodeURIComponent(q.get('k') || '');
  let url = base + '&' + action;
  for (let i = 0; i < 60; i++) {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    const j = await r.json().catch(() => ({}));
    if (j.next) { url = base + '&find=1&cursor=' + j.next; continue; }
    break;
  }
  location.reload();
}
setTimeout(() => location.reload(), 60000);
</script></body></html>`;
}

const wantsHtml = (req) => String(req.headers.accept || "").includes("text/html");

function finish(req, res, state, note, json) {
  if (wantsHtml(req)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(page(state, note));
  }
  return res.status(200).json({
    ok: true,
    note,
    queued: state.queue.length,
    sentToday: state.day === dayKey() ? state.sentToday : 0,
    dailyCap: DAILY_CAP,
    paused: state.paused,
    nextAt: state.nextAt || 0,
    window: windowState(),
    ...json,
  });
}

/* --------------------------------- handler -------------------------------- */

export default async function handler(req, res) {
  const secret = process.env.WA_HOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "WA_HOOK_SECRET is not set in Vercel" });

  const url = new URL(req.url, "http://local");
  const q = url.searchParams;
  const given = q.get("k") || req.headers["x-bm-key"] || "";
  if (given !== secret) return res.status(401).json({ error: "bad key" });

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  const id = storeId(secret);
  const state = await load(id);

  // A new IST day resets the counter. Checked here rather than on a schedule
  // so it is correct whenever the endpoint is next touched.
  if (state.day !== dayKey()) {
    state.day = dayKey();
    state.sentToday = 0;
  }

  /* --- pause / resume --- */
  if (q.get("pause")) {
    state.paused = true;
    await save(id, state);
    return finish(req, res, state, "Paused. Nothing goes out until you resume.", { paused: true });
  }
  if (q.get("resume")) {
    state.paused = false;
    await save(id, state);
    return finish(req, res, state, "Resumed.", { paused: false });
  }

  /* --- never contact --- */
  const drop = q.get("drop");
  if (drop) {
    const p = mobile(drop);
    const before = state.queue.length;
    state.queue = state.queue.filter((x) => x.p !== p);
    // Staying in `seen` is what makes it permanent: seen numbers are never
    // queued again, by find or by seed.
    if (p && !state.seen.includes(p)) state.seen.push(p);
    await save(id, state);
    return finish(req, res, state,
      `${drop}: ${before > state.queue.length ? "removed from the queue" : "was not in the queue"}, and it will never be queued again.`,
      { dropped: p });
  }

  /* --- seed from a paste --- */
  if (q.get("seed")) {
    if (req.method !== "POST") return res.status(405).json({ error: "POST the CSV body to &seed=1" });
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(await readJson(req));
    const rows = parseSeed(raw);
    const seen = new Set(state.seen);
    let added = 0;
    for (const row of rows) {
      const p = mobile(row.phone);
      if (!p || seen.has(p)) continue;
      seen.add(p);
      state.seen.push(p);
      state.queue.push({
        n: clean(row.name, 60), p,
        c: clean(row.category, 30), a: clean(row.area, 30),
        r: parseInt(row.reviews || "0", 10) || 0,
        s: /social/i.test(String(row.presence || "")) ? 1 : 0,
        t: 0,
      });
      added += 1;
    }
    await save(id, state);
    return finish(req, res, state,
      `Added ${added} of ${rows.length} rows. The rest were duplicates, landlines, or had no mobile number.`,
      { added, read: rows.length });
  }

  /* --- fill the queue from Google --- */
  if (q.get("find")) {
    const target = Math.min(MAX_QUEUE, parseInt(q.get("target") || "150", 10));
    if (q.get("reset")) state.cursor = 0;
    else if (q.get("cursor")) state.cursor = parseInt(q.get("cursor"), 10) || state.cursor;
    if (state.queue.length >= target) {
      return finish(req, res, state, `Queue already holds ${state.queue.length}. Nothing to find.`, { added: 0 });
    }
    const out = await findMore(state, target, 35_000);
    await save(id, state);
    const more = !out.done && !out.error && state.queue.length < target;
    return finish(req, res, state,
      out.error
        ? `Searched ${state.cursor} of ${PAIRS.length} combinations, added ${out.added}. Google said: ${out.error}`
        : `Added ${out.added}. Queue now ${state.queue.length}. Searched ${state.cursor} of ${PAIRS.length} combinations.`,
      { added: out.added, next: more ? state.cursor : null, error: out.error || null });
  }

  /* --- the tick: at most one message --- */
  if (q.get("tick")) {
    const force = !!q.get("force");
    const skip = (reason, extra = {}) =>
      finish(req, res, state, `Nothing sent — ${reason}.`, { sent: false, reason, ...extra });

    if (state.paused) return skip("the queue is paused");
    if (!state.queue.length) return skip("the queue is empty");

    const w = windowState();
    if (!w.open && !force) return skip(w.reason);
    if (state.sentToday >= DAILY_CAP && !force) return skip(`today's cap of ${DAILY_CAP} is used up`);
    if (Date.now() < (state.nextAt || 0) && !force) {
      const mins = Math.ceil((state.nextAt - Date.now()) / 60000);
      return skip(`it is not time yet (about ${mins} min)`, { nextAt: state.nextAt });
    }

    // Take the head of the queue, skipping anyone already in a thread. A
    // conversation existing means one of two things and both say don't send:
    // we opened this thread before, or they wrote to us first and are a real
    // lead rather than a cold number.
    let p = null;
    while (state.queue.length) {
      const cand = state.queue.shift();
      if (await hasConversation(convoId(cand.p, secret))) {
        state.log.unshift({ at: istClock(), n: cand.n, p: cand.p, ok: false, err: "already in a conversation" });
        continue;
      }
      p = cand;
      break;
    }
    if (!p) {
      await save(id, state);
      return skip("everyone left in the queue is already in a conversation");
    }

    const text = compose(p);
    const out = await sendViaEvolution(p.p, text);

    if (out.ok) {
      await seedConversation(convoId(p.p, secret), text);
      state.sentToday += 1;
      // Jitter on top of the gap: an exact five-minute rhythm is itself a
      // machine signature, and the rhythm is what gets looked at.
      state.nextAt = Date.now() + GAP_MS + Math.floor(Math.random() * 180_000);
      state.log.unshift({ at: istClock(), n: p.n, p: p.p, ok: true });
      console.log("[wa-outreach] sent", p.p, p.n);
    } else {
      p.t = (p.t || 0) + 1;
      // Three failures is a number that does not work, not a bad minute.
      if (p.t < 3) state.queue.unshift(p);
      state.nextAt = Date.now() + 60_000;
      state.log.unshift({ at: istClock(), n: p.n, p: p.p, ok: false, err: out.error });
      console.error("[wa-outreach] send failed", p.p, out.error);
    }

    await save(id, state);
    return finish(req, res, state,
      out.ok ? `Sent to ${p.n} (${p.p}).` : `Failed for ${p.n}: ${out.error}`,
      { sent: out.ok, to: p.p, error: out.error || null });
  }

  /* --- status --- */
  return finish(req, res, state, "", {});
}
