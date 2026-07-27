// Assembles the operations manual and prints it to PDF via Chromium.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const DIR = import.meta.dirname;
const SHOTS = path.join(DIR, "shots");
const b64 = (f) => "data:image/png;base64," + fs.readFileSync(path.join(SHOTS, f)).toString("base64");

// Live CLI output, captured rather than retyped.
const clean = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const quoteOut = clean(execSync("node scripts/quote.mjs commerce-cod", { cwd: "/workspace/commerce-skeleton", encoding: "utf8" }));
const presetOut = clean(execSync("node scripts/quote.mjs", { cwd: "/workspace/commerce-skeleton", encoding: "utf8" })).split("All features")[0];

const shot = (f, cap) => `<figure><img src="${b64(f)}" alt="${cap}"/><figcaption>${cap}</figcaption></figure>`;
const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Brand Mint — Operations Manual</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color:#16241f; font-size:10.5pt; line-height:1.55; margin:0; }
  h1 { font-size:26pt; margin:0 0 4pt; letter-spacing:-.5pt; }
  h2 { font-size:15pt; margin:0 0 10pt; padding-bottom:5pt; border-bottom:2px solid #10b981; page-break-after:avoid; }
  h3 { font-size:11.5pt; margin:16pt 0 5pt; page-break-after:avoid; }
  p { margin:0 0 8pt; }
  .cover { height:250mm; display:flex; flex-direction:column; justify-content:center; page-break-after:always; }
  .cover .mark { width:54px;height:54px;border-radius:50%;background:linear-gradient(140deg,#7cf6c8,#10b981); margin-bottom:18pt; }
  .cover .sub { color:#5d7368; font-size:12pt; margin-top:6pt; }
  .cover ol { color:#294a40; margin-top:26pt; }
  section { page-break-before:always; }
  figure { margin:10pt 0 14pt; page-break-inside:avoid; }
  img { width:100%; border:1px solid #d8e0d4; border-radius:5px; display:block; }
  figcaption { font-size:8.5pt; color:#5d7368; margin-top:4pt; font-style:italic; }
  ol,ul { margin:0 0 10pt; padding-left:18pt; }
  li { margin-bottom:4pt; }
  .note { background:#e3f5ec; border-left:3px solid #0b6b4f; padding:8pt 11pt; margin:10pt 0; page-break-inside:avoid; }
  .warn { background:#fbe9e7; border-left:3px solid #b3261e; padding:8pt 11pt; margin:10pt 0; page-break-inside:avoid; }
  .warn strong, .note strong { display:block; margin-bottom:3pt; }
  pre { background:#0b1f1a; color:#d7efe6; padding:9pt 11pt; border-radius:5px; font-size:7.4pt; line-height:1.4;
        overflow:hidden; white-space:pre-wrap; page-break-inside:avoid; font-family:"DejaVu Sans Mono",monospace; }
  table { width:100%; border-collapse:collapse; margin:8pt 0 12pt; font-size:9.5pt; page-break-inside:avoid; }
  th { text-align:left; font-size:7.5pt; text-transform:uppercase; letter-spacing:.5pt; color:#5d7368;
       border-bottom:1px solid #d8e0d4; padding:4pt 6pt; }
  td { padding:5pt 6pt; border-bottom:1px solid #eef2ec; vertical-align:top; }
  code { background:#eef2ec; padding:1pt 3pt; border-radius:2px; font-size:8.6pt; font-family:"DejaVu Sans Mono",monospace; }
  .step { background:#f5f7f4; border-radius:5px; padding:9pt 12pt; margin:9pt 0; page-break-inside:avoid; }
  .step b { color:#064e3b; }
</style></head><body>

<div class="cover">
  <div class="mark"></div>
  <h1>Brand Mint</h1>
  <div class="sub">Operations manual — admin, client and quotation</div>
  <p class="sub" style="font-size:9.5pt;margin-top:20pt;max-width:120mm">
    Every screenshot is the real application, captured from the actual pages.
    Data shown is representative seed data.
  </p>
  <ol>
    <li>Super admin — running the studio</li>
    <li>Creating a client login</li>
    <li>Proving tenant isolation</li>
    <li>Quoting a job</li>
    <li>What the client sees</li>
    <li>The skeleton and the feature catalogue</li>
  </ol>
</div>

<section>
<h2>1 · Super admin — running the studio</h2>
<p>You sign in at <code>/login</code> with <code>admin</code> and land on <code>/studio</code>. Everyone else lands on <code>/portal</code>.</p>
${shot("10-studio-top.png","The three numbers that decide the month. MRR counts cash only — compensation in kind is shown but never summed, because this gauge answers \"can I cover this month\".")}
<h3>Leads — and the one button that matters</h3>
<p>Market median first response is about 42 hours. Under five minutes makes qualification roughly 21× more likely. Log the lead when it arrives, then press <b>Log first response</b> the moment you reply. It stamps once and can never be edited — a number you can move afterwards stops meaning anything.</p>
${shot("11-studio-leads.png","Leads. A lead with no reply yet shows a live waiting time, red past five minutes.")}
<h3>Delivery health</h3>
<div class="note"><strong>Empty is not the same as done</strong>
A project with no milestones reads <em>“No milestones yet”</em> in grey — never green, never “All complete”. “All complete” is reserved for projects that actually have milestones and none are outstanding.</div>
${shot("13-studio-delivery.png","Who each project is waiting on, and how old the oldest blocker is.")}
<h3>Managing a project</h3>
<p>Set the project type to unlock its milestone template, then stamp it from a start date <em>you</em> choose — no schedule is ever invented.</p>
${shot("14-studio-manage.png","Project fields, milestones, intake and deliverables. Everything saves as you change it.")}
</section>

<section>
<h2>2 · Creating a client login</h2>
<div class="warn"><strong>This is a two-part job — both parts are required</strong>
Firebase creates the password. <code>/studio</code> creates the permissions. Do only the first and the client signs in perfectly, sees “No active project”, and messages you — which is the exact cost this portal exists to remove.</div>
<div class="step"><b>Part A — Firebase Console</b>
<ol>
<li>Authentication → Users → <b>Add user</b></li>
<li>Email: the synthetic address, e.g. <code>greenbasket@brandmintstudios.in</code> — not their real email. The panel below shows you the exact string.</li>
<li>Set a password <b>here</b>. This is the only place it will ever exist.</li>
<li><b>Copy the UID</b> from the new row.</li>
</ol></div>
<div class="step"><b>Part B — /studio → Client Access</b>
<ol start="5"><li>Paste the UID, pick the organisation, enter name and username, Save.</li></ol></div>
${shot("12-studio-access.png","The Client Access panel. It takes a UID — there is no password field anywhere in this application except the client's own login screen.")}
<div class="note"><strong>Why Part B is not optional</strong>
The security rules resolve a client's organisation by reading <code>users/{uid}</code>. With no such document that client can read <em>nothing</em> — not their org, not their project, not their invoices.</div>
<h3>Never</h3>
<ul>
<li>Never type a client's password into any Brand Mint screen.</li>
<li>Never ask a client for a password, API key or token for their own systems. Access is always <em>“add hello@brandmintstudios.in as a user on your own account”</em>. Every requirement the quote tool prints is already worded that way.</li>
</ul>
</section>

<section>
<h2>3 · Proving tenant isolation</h2>
<p>Do this once, the first time you create a client. Sign in as that client in a private window and open <code>/tenancy-check</code>. The page reads every known organisation and project directly — it has no allow-list of its own, so the security rules alone decide every row.</p>
${shot("34-tenancy-client.png","Run as Green Basket. Their own org and project are readable; every other tenant is denied — and the denials are green, because for another tenant's data a denial is the pass condition.")}
<div class="note"><strong>Colour follows correctness, not success</strong>
A red “denied” would report correct behaviour as a failure. The page colours by whether the result is what isolation requires.</div>
<p>Run the same page as admin and it refuses to claim a pass:</p>
${shot("35-tenancy-admin.png","As admin the verdict is “Inconclusive”. The admin sees everything by design, so a green tick here would prove nothing.")}
</section>

<section>
<h2>4 · Quoting a job</h2>
<p>Two ways in. The command line is fastest for you; the page produces the document you send.</p>
<h3>From the command line</h3>
<pre>${esc(presetOut.trim())}</pre>
<p>Quote a shape and it prints the price, the architecture decision, what to ask the client for, and the internal build checklist:</p>
<pre>${esc(quoteOut.split("WHAT WE NEED FROM THE CLIENT")[0].trim())}</pre>
<div class="note"><strong>Dependencies are priced for you</strong>
Quote a checkout and it silently adds the catalogue and the site underneath it, and prices all three. Quoting a checkout without the catalogue under it is how a fixed price loses money.</div>
<h3>From /studio → Scope &amp; quote</h3>
${shot("20-quote-builder.png","Tick what they are buying. Anything needing server-side code is flagged here — at quote time, not discovered mid-build.")}
${shot("21-quote-pricing.png","Add-on prices are yours to set, once. A feature with no price refuses to quote rather than guessing.")}
<h3>The document you send</h3>
${shot("22-quote-document.png","What is included, the investment, what we need from them, what is free after launch, and what costs extra. Print to PDF and attach it to the SOW.")}
<table>
<tr><th>Free</th><th>Chargeable</th></tr>
<tr><td>Anything not behaving as specified, for 30 days after delivery</td><td>Design changes after sign-off</td></tr>
<tr><td>2 review rounds during the build</td><td>New integrations not in the SOW</td></tr>
<tr><td></td><td>Additional pages, screens or features</td></tr>
<tr><td></td><td>Review rounds 3+ at ₹15,000 each</td></tr>
</table>
<div class="warn"><strong>When they ask for something not in the scope</strong>
“Happy to do that. It’s outside the signed scope, so let me send you a quick quote — I won’t start until you’ve approved it.” Then quote it and send the document. Never “just add it”. Never quote after building.</div>
</section>

<section>
<h2>5 · What the client sees</h2>
<p>They click <b>Log in</b> on the marketing site and type the username you gave them — not an email. The system maps <code>greenbasket</code> to <code>greenbasket@brandmintstudios.in</code> behind the scenes.</p>
${shot("01-marketing-home.png","The public site. “Log in” is the client's front door.")}
${shot("02-login.png","Username and password. The only password field in the whole system, and it is the client typing their own.")}
${shot("03-login-failed.png","Wrong username and wrong password give the identical message, so nobody can probe which usernames exist.")}
<h3>The portal — five things, never six</h3>
${shot("31-portal-blockers.png","“What we need from you” — open items, dated, oldest first. This is the reason the product exists: it does the chasing so you don't have to.")}
${shot("32-portal-approvals.png","Deliverables waiting on them. One click to approve or request changes.")}
<div class="note"><strong>A client can make exactly two changes</strong>
Tick an intake item, and approve or request changes on a deliverable. Nothing else — enforced by the security rules, not by the interface.</div>
${shot("33-onboarding.png","The onboarding checklist, grouped Assets / Content / Access / Decisions — carrying the never-send-a-password line.")}
</section>

<section>
<h2>6 · The skeleton and the feature catalogue</h2>
<p>New client builds start from <code>commerce-skeleton</code> rather than from nothing. You edit one file — <code>brand.config.ts</code> — and the application configures itself. The same feature list drives both the quote and what the app renders, so the price and the product cannot drift apart.</p>
<table>
<tr><th>Repository</th><th>What it is</th></tr>
<tr><td><code>commerce-core</code></td><td>Order state machine, coupon engine, India GST validation, money formatting. No UI, no framework, zero dependencies.</td></tr>
<tr><td><code>commerce-skeleton</code></td><td>Feature registry, pricing model, the quote command, daily CI.</td></tr>
</table>
<h3>Why they exist</h3>
<p>Tresor Couture and FreshKart were the same system built twice. Order status alone: Tresor used <code>pending / placed / paid / shipped / delivered / cancelled / refunded</code>; FreshKart used <code>PENDING / CONFIRMED / PACKED / SHIPPED / DELIVERED / CANCELLED</code>. Different states, different casing, and a different model — Tresor folded payment into fulfilment, so an order could not be both paid and shipped. Every fix had to be made twice and drifted apart.</p>
<div class="note"><strong>The MSA already protects this</strong>
Clause 4.2 — “Studio retains ownership of Studio’s pre-existing tools, methodologies, libraries and internal frameworks.” That is what makes the skeleton legally reusable on every client project. Keep signing it.</div>
<h3>Pricing</h3>
<p>One rate, one formula: <code>build days × day rate × scale</code>. The rate is ₹10,000, derived from Brand Mint's own published prices divided by its own published timelines. Change that one constant and the entire catalogue reprices.</p>
<h3>Starting a client</h3>
<ol>
<li>Create a repository from the skeleton.</li>
<li><code>npm run quote</code> until the scope matches what they are buying.</li>
<li>Paste the printed features and scale into <code>brand.config.ts</code>, with their name, domain and theme.</li>
<li>Push. Vercel builds a preview. Promote when it is right.</li>
</ol>
</section>

</body></html>`;

const out = path.join(DIR, "manual.html");
fs.writeFileSync(out, html);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
await page.goto("file://" + out, { waitUntil: "networkidle" });
const pdf = "/home/user/Brand-Mint-Hyderabad/docs/Brand-Mint-Operations-Manual.pdf";
fs.mkdirSync(path.dirname(pdf), { recursive: true });
await page.pdf({ path: pdf, format: "A4", printBackground: true,
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" } });
await browser.close();
console.log("PDF -> " + pdf);
console.log("size: " + (fs.statSync(pdf).size / 1024 / 1024).toFixed(2) + " MB");
