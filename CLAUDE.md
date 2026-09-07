# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Brand Mint sells **online stores to Indian brands in four fixed-price tiers**. This repo is the whole business surface: the public home page that shows the tiers, the Google sign-in that turns a visitor into a lead, the client portal where a paying client watches their project, and the admin where the studio runs it.

It is a **static HTML/CSS/JS site with no build step** — files are served as-is by Vercel. The backend is **Firebase** (Firestore + Firebase Auth, project `brandmintstudios-a5eb7`), loaded at runtime as ES modules from `https://www.gstatic.com/firebasejs/<version>/`. No bundler, no npm, no package.json.

## The one flow that matters

```
Home page → "Choose <tier>" → /login?tier=<id> → Google sign-in
  → profiles/{uid} gets consent + selectedTier, a leads doc is created (with uid)
  → `?tier=platform` is the Site + CRM line and follows the same flow
  → portal shows the services review: tier in full (with inherited tiers), switch tier, needs, steps, care plans, FAQ
Admin: Leads → Convert to client
  → clients doc (status: onboarding, storeTier), clientUsers/{uid}_{clientId}, projects stub
  → portal shows the onboarding checklist: agreement (a deliverable of kind "document") + 50% deposit invoice
Admin: Delivery → Mark agreement signed → Mark deposit received
  → clients.status = active → portal becomes the live timeline
```

There is no contact form and no invite email. Sign-in **is** the form. Consent to privacy/terms is stated on the sign-in button; the newsletter is an optional tick. Everything the studio learns about a person before the call is on their `profiles` doc and their `leads` doc.

## Files

| Path | Role |
|---|---|
| `index.html` + `styles.css` | **The landing page.** Hero with a proof panel, the work, three headline offers, how it works, who you work with, FAQ. Leads with work and books a call — it carries no price list |
| `pricing.html` | Every price: the five categories, the four store tiers, the care plans. Linked from the nav and the home page |
| `shared/work.js` | **The portfolio** — `WORK` (shipped brands), `BUILDING` (in development), `PROOF` (the numbers under the hero). Screenshots go in `work/<id>.jpg`; a missing one falls back to a typographic card. Never put a metric here that is not real |
| `shared/services.js` | **The service ladder** — the five categories the home page lists (Static Website ₹14,999, Online Store from ₹49,999, Site + CRM ₹79,999 once, Custom CRM, Modcon HR), each with its starting price and CTA. A category id used as a CTA must also appear in the `tier in [...]` list on `leads` in `firestore.rules` |
| `shared/tiers.js` | The four tiers (id, name, price, weeks, blurb, grouped inclusions), `CARE_PLANS`, `STEPS`, `FAQ`, `NEEDS`, and `inclusionsFor()`. Single source of truth for home, login, portal, admin |
| `login.html` | Google sign-in. Reads `?tier=`, calls `recordSignup()` after auth |
| `auth/session.js` | One Firebase Auth session for every surface. `requireRole()`, `getProfile()`, `recordSignup()`, `claimPendingInvites()` |
| `firebase/app.js`, `firebase/config.js` | SDK loader and web config. **Three placeholder values in config.js must be filled from the console** — see `SETUP-FIREBASE.md` |
| `firestore.rules` | **The security boundary.** Admin sees all; a client sees only docs carrying their `clientId`; a lead can only write their own profile and lead |
| `portal.html` + `portal/` | Client side. Three states in `portal/app.js`: lead (no membership) → onboarding (`clients.status !== "active"`) → active |
| `admin.html` + `admin/` | Studio side. Hash router in `admin/app.js`; modules: dashboard, leads, onboarding, clients, delivery, pipeline, invoices, settings |
| `admin/modules/analytics.js`, `heatmap.js` | Admin → Analytics (KPIs, daily line, tiers, sections, scroll depth, devices, referrers, portal actions) and Heat map (clicks + scroll depth over the real page in a same-origin iframe). Both read `events` on demand via `db.fetchEvents()`, never cached |
| `admin/db.js` | Sync in-memory cache fed by one `onSnapshot` per collection; writes are fire-and-forget. Add new collections to `COLLECTIONS` and `cache` |
| `shared/brief.js` | The onboarding questionnaire (portal renders it, admin reads it) |
| `platform.html` + `shared/platform.js` | **Site + CRM** — the second service line, separate from the store tiers. Website + admin + lead CRM + WhatsApp API + chat agent + Meta lead import + analytics, ₹79,999 setup + ₹9,999/mo. The page body is static HTML on purpose (it is meant to rank); `shared/platform.js` is the source for the price used by `login.html`, the home-page band and admin leads. **Change a price in both.** |
| `shared/analytics.js` | First-party analytics. Loaded by every public page and the portal; writes page views, clicks (with coordinates), scroll depth, section reach, time on page and `track()` events straight to Firestore REST (`events`). Off under DNT/GPC and inside the heat-map iframe (`?bm_nt=1`) |
| `downloads/` | The three free PDFs (checklist, catalogue template, scope worksheet) + CSV. Sources in `downloads/src/`, regenerate with `node downloads/src/render.cjs` |
| `shared/quiz.js` | The Store Readiness Score: 10 questions, `scoreQuiz()` → score/100, tier fit, three fixes. Saved to `profiles/{uid}.readiness`; admin shows it on the lead |
| `shared/resources.js` | Free perks (asked for on WhatsApp), `LESSONS`, `COMPLIANCE`, upcoming `PRODUCTS` (Modcon HR, Real Estate CRM). Portal renders them in every signed-in state; requests land in the `requests` collection and show in Admin → Leads |
| `marketing/video/` | The video production kit — prompts, VO scripts, logo refs. Assets, not code. Keep. |
| `brand-kit/` | Logo SVGs and brand guidelines (palette, type) |
| `privacy.html`, `terms.html`, `404.html` | Legal pages the sign-in consent links to |
| `api/` | **The only server-side code.** Vercel serverless functions: `subscribe.js` (Resend contact + the free toolkit email, called after sign-in) and `book.js` (the booking form → email to the studio + confirmation). No npm deps, Node built-ins only. Keys are Vercel env vars — see `SETUP-EMAIL.md` |
| `SETUP-EMAIL.md` | Resend + Vercel env var checklist. Until it is done the endpoints answer 200 with `skipped` and nothing breaks |
| `SETUP-FIREBASE.md` | Operator checklist: paste config, create Firestore, publish rules, enable Google, promote first admin |

## Commands

```bash
python3 -m http.server 8000     # then /  /login  /admin  /portal
```

No tests, no linter. Verify changes by driving pages headlessly with the globally-installed Playwright (`NODE_PATH=$(npm root -g) node script.cjs`), asserting DOM and checking `pageerror`. `gstatic.com` and `googleapis.com` are blocked in the sandbox, so Firebase-backed behaviour can't be exercised locally — the gate/redirect logic and rendering can.

## Rules that will bite you

- **Bump `?v=` on every CSS/JS reference** in `index.html`, `login.html`, `admin.html`, `portal.html` when you change the file, or returning visitors get the cached one.
- **Firestore rules filter documents, not queries.** Every portal read carries `where("clientId","==",…)`. A query that isn't already constrained is rejected outright.
- **`clientUsers` doc id is `{uid}_{clientId}`** and **`invites` id is `{email}_{clientId}`** — rules check membership with a single `exists()` on those paths.
- `clients.tier` is the old customer-value tier ("Tier 1/2/3"). The store tier is **`clients.storeTier`** / `projects.storeTier` / `leads.tier`. Don't conflate them.
- The role lives in `profiles/{uid}.role`, never in a claim or anything the client writes. Rules pin new profiles to `client`; the first admin is set in the Firebase console.
- After editing `firestore.rules`, republish with `node scripts/setup-firebase.mjs --only rules --key <service-account.json>`.
- Demo data is **not** seeded on boot. `bm.seed()` in the admin console if you want the sample set.
- The profile hint in localStorage (`bm.auth.profile.v1`) is a first-paint display hint only. Forging it shows a nav link and an empty dashboard.
