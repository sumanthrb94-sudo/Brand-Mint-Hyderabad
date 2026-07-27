// Drives the real pages in Chromium and captures screenshots for the manual.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { firebaseAppStub, firebaseAuthStub, firestoreStub } from "./stub.mjs";
import { store, ADMIN_USER, CLIENT_USER } from "./seed.mjs";

const ROOT = "/home/user/Brand-Mint-Hyderabad";
const OUT = path.resolve(import.meta.dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });

const PORT = 8123, BASE = `http://127.0.0.1:${PORT}`;
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  let f = path.join(ROOT, p);
  if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const shots = [];

async function ctxFor(user) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  // Serve the stub in place of the blocked gstatic CDN.
  await ctx.route("https://www.gstatic.com/firebasejs/**", (route) => {
    const u = route.request().url();
    const body = u.includes("firebase-app") ? firebaseAppStub()
      : u.includes("firebase-auth") ? firebaseAuthStub()
      : firestoreStub(store);
    route.fulfill({ status: 200, contentType: "text/javascript", body });
  });
  // Google Fonts are also blocked; the pages fall back to system fonts.
  await ctx.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await ctx.route("https://fonts.gstatic.com/**", (r) => r.abort());
  if (user) await ctx.addInitScript((u) => { globalThis.__BM_USER = u; }, user);
  return ctx;
}

async function shoot(ctx, route, name, caption, opts = {}) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(opts.settle ?? 900);
  if (opts.scrollTo) {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), opts.scrollTo);
    await page.waitForTimeout(400);
  }
  const file = path.join(OUT, `${name}.png`);
  const target = opts.clip ? page.locator(opts.clip).first() : page;
  await target.screenshot({ path: file, fullPage: opts.fullPage && !opts.clip });
  shots.push({ name, route, caption, file, errors: errs });
  console.log(`  ${errs.length ? "!" : "✓"} ${name.padEnd(28)} ${route}${errs.length ? "  errors: " + errs[0].slice(0, 70) : ""}`);
  await page.close();
  return page;
}

console.log("\nMARKETING + LOGIN");
{
  const ctx = await ctxFor(null);
  await shoot(ctx, "/", "01-marketing-home", "The public site. 'Log in' in the nav is the client's front door.", { clip: "header.nav" });
  await shoot(ctx, "/login", "02-login", "The only page with a password field — and it is the client typing their own.", { settle: 1200 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#bm-username", "greenbasket");
  await page.fill("#bm-password", "wrong-password");
  await page.click("#bm-login-submit");
  await page.waitForSelector("#bm-login-status:not([hidden])", { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(OUT, "03-login-failed.png") });
  shots.push({ name: "03-login-failed", route: "/login", caption: "One message for both wrong-username and wrong-password. Nobody can probe which usernames exist.", file: path.join(OUT, "03-login-failed.png"), errors: [] });
  console.log("  ✓ 03-login-failed             /login");
  await page.close();
  await ctx.close();
}

console.log("\nSUPER ADMIN — /studio");
{
  const ctx = await ctxFor(ADMIN_USER);
  await shoot(ctx, "/studio", "10-studio-top", "Signed MRR against break-even, open leads, median first response.", { waitFor: "#bm-main:not([hidden])", clip: ".bm-stats" });
  await shoot(ctx, "/studio", "11-studio-leads", "Leads. 'Log first response' is the highest-value button on the page.", { waitFor: "#bm-main:not([hidden])", clip: "section.bm-card:nth-of-type(3)" });
  await shoot(ctx, "/studio", "12-studio-access", "Client Access. Takes a UID — never a password.", { waitFor: "#bm-access-form", clip: "#bm-access-form" });
  await shoot(ctx, "/studio", "13-studio-delivery", "Delivery health. Empty collections say so; they never read as 'done'.", { waitFor: "#bm-delivery-body", clip: "#bm-delivery-body" });
  await shoot(ctx, "/studio", "14-studio-manage", "Per-project editing and the milestone template stamp.", { waitFor: "#bm-manage-projects", clip: ".bm-manage-card" });
  await shoot(ctx, "/studio", "15-studio-full", "The whole admin dashboard.", { waitFor: "#bm-main:not([hidden])", fullPage: true });
  await ctx.close();
}

console.log("\nQUOTATION — /quote");
{
  const ctx = await ctxFor(ADMIN_USER);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/quote`, { waitUntil: "networkidle" });
  await page.waitForSelector("#bm-main:not([hidden])", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.selectOption("#bm-base-service", "site").catch(() => {});
  await page.fill("#bm-client-name", "Green Basket");
  for (const id of ["cod", "payments-razorpay", "gst-invoicing", "returns-refunds", "chat-support"]) {
    await page.check(`[data-feature="${id}"]`).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  await page.locator(".bm-card").first().screenshot({ path: path.join(OUT, "20-quote-builder.png") });
  shots.push({ name: "20-quote-builder", route: "/quote", caption: "Tick what they are buying. Features needing a server are flagged here, not discovered mid-build.", file: path.join(OUT, "20-quote-builder.png"), errors: [] });
  const pricing = page.locator("#bm-pricing-rows");
  await pricing.screenshot({ path: path.join(OUT, "21-quote-pricing.png") });
  shots.push({ name: "21-quote-pricing", route: "/quote", caption: "Add-on prices are yours. An unpriced feature refuses to quote.", file: path.join(OUT, "21-quote-pricing.png"), errors: [] });
  const docEl = page.locator("#bm-scope-doc");
  await docEl.screenshot({ path: path.join(OUT, "22-quote-document.png") });
  shots.push({ name: "22-quote-document", route: "/quote", caption: "The client-facing scope document. Print to PDF and attach to the SOW.", file: path.join(OUT, "22-quote-document.png"), errors: [] });
  console.log("  ✓ 20/21/22 quote");
  await page.close();
  await ctx.close();
}

console.log("\nCLIENT — /portal, /onboarding");
{
  const ctx = await ctxFor(CLIENT_USER);
  await shoot(ctx, "/portal", "30-portal-full", "What the client sees. Five things, never six.", { waitFor: "#bm-main:not([hidden])", fullPage: true });
  await shoot(ctx, "/portal", "31-portal-blockers", "'What we need from you' — dated, oldest first. The reason this product exists.", { waitFor: "#bm-intake-list", clip: "section.bm-card:nth-of-type(2)" });
  await shoot(ctx, "/portal", "32-portal-approvals", "One click to approve or request changes.", { waitFor: "#bm-deliverables-list", clip: "section.bm-card:nth-of-type(3)" });
  await shoot(ctx, "/onboarding", "33-onboarding", "The intake checklist. Note the never-send-a-password line.", { waitFor: "#bm-main:not([hidden])", fullPage: true });
  await shoot(ctx, "/tenancy-check", "34-tenancy-client", "Run as a client: proof that other tenants are unreadable.", { waitFor: "#bm-main:not([hidden])", fullPage: true });
  await ctx.close();
}

console.log("\nTENANCY — as admin (must be inconclusive)");
{
  const ctx = await ctxFor(ADMIN_USER);
  await shoot(ctx, "/tenancy-check", "35-tenancy-admin", "As admin it refuses to claim a pass — the admin sees everything by design.", { waitFor: "#bm-main:not([hidden])", clip: "section.bm-card" });
  await ctx.close();
}

await browser.close();
server.close();

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(shots.map(s => ({ ...s, file: path.basename(s.file) })), null, 2));
const bad = shots.filter(s => s.errors.length);
console.log(`\n${shots.length} screenshots -> ${OUT}`);
if (bad.length) { console.log("Pages with JS errors:"); bad.forEach(b => console.log(`  ${b.name}: ${b.errors[0].slice(0,120)}`)); }
