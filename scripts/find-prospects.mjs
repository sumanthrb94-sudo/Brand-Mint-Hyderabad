#!/usr/bin/env node
/**
 * Find Hyderabad businesses that have a Google listing but no website.
 *
 * Uses the Google Places API, not a scraper. That matters for two reasons
 * beyond the legal one: scraping Maps gets an IP blocked within a few hundred
 * requests, and the rendered page does not reliably tell you whether a
 * business has a website — which is the entire filter this campaign needs.
 * The API returns websiteUri as a field, so "has a listing, has a phone, has
 * no site" is an exact query rather than a guess.
 *
 * Setup once:
 *   1. console.cloud.google.com -> APIs & Services -> Enable "Places API (New)"
 *   2. Credentials -> Create API key
 *   3. export GOOGLE_PLACES_KEY=AIza...
 *
 * Run:
 *   node scripts/find-prospects.mjs --limit 150
 *   node scripts/find-prospects.mjs --limit 150 --out prospects.csv
 *   node scripts/find-prospects.mjs --area "Kukatpally" --limit 40
 *
 * Then import what you keep:
 *   node scripts/scrape-leads.js --file=prospects.csv --dry-run
 *
 * Cost: Text Search is billed per request, ~$32 per 1000 at list price, with a
 * recurring free monthly allowance. Each request returns up to 20 places, so a
 * 150-prospect run is a few dozen requests — cents, not rupees. Check current
 * pricing before a large run.
 */

const KEY = process.env.GOOGLE_PLACES_KEY;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Only the fields this needs. The mask is also what you are billed on: asking
// for fewer fields moves the request to a cheaper tier.
const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

/** Trades that live or die on being found locally and usually have no site. */
const CATEGORIES = [
  "boutique", "saree shop", "jewellery shop", "furniture shop",
  "interior designer", "event planner", "caterer", "bakery",
  "gym", "yoga studio", "salon", "spa",
  "dental clinic", "physiotherapy clinic", "diagnostic centre",
  "coaching centre", "play school", "driving school",
  "packers and movers", "car service centre", "electrician", "plumber",
  "printing press", "photographer", "travel agency", "real estate agent",
  "pet shop", "nursery plants", "hardware store", "auto parts shop",
];

/** Hyderabad, in the chunks locals actually name. */
const AREAS = [
  "Madhapur Hyderabad", "Gachibowli Hyderabad", "Kondapur Hyderabad",
  "Kukatpally Hyderabad", "Miyapur Hyderabad", "Banjara Hills Hyderabad",
  "Jubilee Hills Hyderabad", "Begumpet Hyderabad", "Ameerpet Hyderabad",
  "Secunderabad", "Uppal Hyderabad", "LB Nagar Hyderabad",
  "Dilsukhnagar Hyderabad", "Kompally Hyderabad", "Manikonda Hyderabad",
  "Attapur Hyderabad", "Nizampet Hyderabad", "Alwal Hyderabad",
];

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const LIMIT = parseInt(arg("limit", "120"), 10);
const OUT = arg("out", "prospects.csv");
const ONLY_AREA = arg("area", "");

if (!KEY) {
  console.error("GOOGLE_PLACES_KEY is not set.\n" +
    "  console.cloud.google.com -> enable 'Places API (New)' -> create an API key\n" +
    "  export GOOGLE_PLACES_KEY=AIza...");
  process.exit(1);
}

/** A listing whose only "website" is a social page still has no website — and
 *  is often a better prospect, because they already tried and outgrew it. */
const SOCIAL = /facebook\.com|instagram\.com|linktr\.ee|wa\.me|whatsapp\.com|justdial\.com|indiamart\.com|sites\.google\.com|business\.site|wixsite\.com|blogspot\./i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(textQuery, pageToken) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": FIELDS,
    },
    body: JSON.stringify({
      textQuery,
      regionCode: "IN",
      languageCode: "en",
      pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // A bad key or a disabled API fails every query the same way; say so once
    // rather than printing the same error thirty times.
    throw new Error(`Places API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

const csvCell = (v) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const found = new Map();
const areas = ONLY_AREA ? [ONLY_AREA.includes("Hyderabad") ? ONLY_AREA : ONLY_AREA + " Hyderabad"] : AREAS;

console.log(`Searching ${areas.length} areas x ${CATEGORIES.length} categories for listings with no website.\n`);

outer:
for (const area of areas) {
  for (const category of CATEGORIES) {
    let pageToken;
    for (let page = 0; page < 2; page++) {
      let data;
      try {
        data = await search(`${category} in ${area}`, pageToken);
      } catch (e) {
        console.error(String(e.message));
        if (/40[13]|API_KEY|PERMISSION/i.test(e.message)) process.exit(1);
        break;
      }
      for (const pl of data.places || []) {
        if (found.has(pl.id)) continue;
        if (pl.businessStatus && pl.businessStatus !== "OPERATIONAL") continue;
        const site = pl.websiteUri || "";
        if (site && !SOCIAL.test(site)) continue;       // already has a real site
        const phone = pl.nationalPhoneNumber || pl.internationalPhoneNumber || "";
        if (!phone) continue;                            // no way to reach them
        found.set(pl.id, {
          name: pl.displayName?.text || "",
          phone: phone.replace(/[^\d+]/g, ""),
          email: "",
          service: "Static Website",
          category,
          area: area.replace(" Hyderabad", ""),
          address: pl.formattedAddress || "",
          rating: pl.rating ?? "",
          reviews: pl.userRatingCount ?? "",
          // A social-only presence is worth knowing: the opening line writes
          // itself when you can see they are running the business off Instagram.
          currentPresence: site ? "social only" : "none",
          socialUrl: site,
          maps: pl.googleMapsUri || "",
        });
        if (found.size >= LIMIT) break outer;
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
      // The next-page token is not valid immediately.
      await sleep(2200);
    }
    process.stdout.write(`\r  ${found.size}/${LIMIT} found — ${area.replace(" Hyderabad", "")} / ${category}          `);
  }
}

const rows = [...found.values()];
const cols = ["name", "phone", "email", "service", "category", "area", "address",
              "rating", "reviews", "currentPresence", "socialUrl", "maps"];
const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");

const fs = await import("node:fs");
fs.writeFileSync(OUT, csv + "\n");

const noneAtAll = rows.filter((r) => r.currentPresence === "none").length;
console.log(`\n\n${rows.length} prospects -> ${OUT}`);
console.log(`  ${noneAtAll} with no web presence at all`);
console.log(`  ${rows.length - noneAtAll} running on social only`);
console.log(`\nNext: node scripts/scrape-leads.js --file=${OUT} --dry-run`);
