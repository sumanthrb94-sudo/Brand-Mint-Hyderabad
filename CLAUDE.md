# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Brand Mint sells **online stores to Indian brands in four fixed-price tiers**. This repo is the whole business surface: the public home page that shows the tiers, the Google sign-in that turns a visitor into a lead, the client portal where a paying client watches their project, and the admin where the studio runs it.

It is a **static HTML/CSS/JS site with no build step** — files are served as-is by Vercel. The backend is **Firebase** (Firestore + Firebase Auth, project `brandmintstudios-a5eb7`), loaded at runtime as ES modules from `https://www.gstatic.com/firebasejs/<version>/`. No bundler, no npm, no package.json.

## The one flow that matters

```
Home page → "Choose <tier>" → /login?tier=<id> → Google sign-in
  → profiles/{uid} gets consent + selectedTier, a leads doc is created (with uid)
  → portal shows "we'll call you within a day"
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
| `index.html` + `styles.css` | Home page. Tier cards and steps are rendered from `shared/tiers.js` — **edit tiers there, not in HTML** |
| `shared/tiers.js` | The four tiers: id, name, price, weeks, blurb, grouped inclusions. Single source of truth for home, login, portal, admin |
| `login.html` | Google sign-in. Reads `?tier=`, calls `recordSignup()` after auth |
| `auth/session.js` | One Firebase Auth session for every surface. `requireRole()`, `getProfile()`, `recordSignup()`, `claimPendingInvites()` |
| `firebase/app.js`, `firebase/config.js` | SDK loader and web config. **Three placeholder values in config.js must be filled from the console** — see `SETUP-FIREBASE.md` |
| `firestore.rules` | **The security boundary.** Admin sees all; a client sees only docs carrying their `clientId`; a lead can only write their own profile and lead |
| `portal.html` + `portal/` | Client side. Three states in `portal/app.js`: lead (no membership) → onboarding (`clients.status !== "active"`) → active |
| `admin.html` + `admin/` | Studio side. Hash router in `admin/app.js`; modules: dashboard, leads, onboarding, clients, delivery, pipeline, invoices, settings |
| `admin/db.js` | Sync in-memory cache fed by one `onSnapshot` per collection; writes are fire-and-forget. Add new collections to `COLLECTIONS` and `cache` |
| `shared/brief.js` | The onboarding questionnaire (portal renders it, admin reads it) |
| `marketing/video/` | The video production kit — prompts, VO scripts, logo refs. Assets, not code. Keep. |
| `brand-kit/` | Logo SVGs and brand guidelines (palette, type) |
| `privacy.html`, `terms.html`, `404.html` | Legal pages the sign-in consent links to |
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
- Demo data is **not** seeded on boot. `bm.seed()` in the admin console if you want the sample set.
- The profile hint in localStorage (`bm.auth.profile.v1`) is a first-paint display hint only. Forging it shows a nav link and an empty dashboard.
