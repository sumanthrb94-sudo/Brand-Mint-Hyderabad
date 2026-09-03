# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Brand Mint is the marketing site **and** internal admin CRM for a Hyderabad design studio. It is a **static HTML/CSS/JS site with no build step** — files are served as-is. The backend is **Firebase** (Firestore + Firebase Auth, project `brandmintstudios-a5eb7`), loaded at runtime as ES modules from `https://www.gstatic.com/firebasejs/<version>/` (no bundler, no npm dependencies). Deployed on **Vercel**.

There are three apps in one repo, sharing one Firebase project and one auth session:
- **Public marketing site** — `index.html` + `styles.css` + `script.js` + `auth/marketing.js`
- **Admin CRM SPA** — `admin.html` + `admin/` (ES-module app with a hash router and an offline-first Firestore layer). Requires `profiles/{uid}.role == 'admin'`.
- **Client portal** — `portal.html` + `portal/` (what a paying client sees: onboarding brief, timeline, deliverable approvals, invoices, messages). Requires a `client_users` membership.

`login.html` is the single front door for both signed-in apps and routes by role. `shared/brief.js` holds the onboarding questionnaire, read by both the portal (renders the wizard) and the admin (renders the answers).

## Commands

There is **no package.json, build, test runner, or linter**. Standard workflows:

```bash
# Run locally
python3 -m http.server 8000      # then open http://localhost:8000  (site) or /admin.html (CRM)
```

**Verifying changes** (the established pattern in this repo — there are no automated tests): drive the page with headless Chromium via the globally-installed Playwright, and capture state / screenshots.

```bash
# Playwright is installed globally, NOT locally — require it via the global path:
NODE_PATH=$(npm root -g) node /tmp/verify.cjs
# inside the script: const { chromium } = require('playwright');
# load the file with pathToFileURL(process.cwd()+'/index.html')
```

Use this to assert DOM state, intercept `window.open`, check `pageerror`, and screenshot before claiming a change works. (Note: `esm.sh`/Google-Fonts requests fail under `file://` and behind the sandbox egress proxy — those console errors are environment artifacts, not bugs; they work on the real HTTPS deploy.)

## Deploy & cache-busting (critical)

- **`main` is the production branch** and is what deploys live. Vercel also builds a **preview deployment for every branch push**.
- `vercel.json` sets `cleanUrls`, the CSP (which must allow `gstatic.com` for the SDK and `*.googleapis.com` for Auth/Firestore), and caches `styles.css`/`script.js` for 1h. **You MUST bump the `?v=` query string** on the `<link>`/`<script>` refs in `index.html` (and the `?v=` on `admin/*` refs in `admin.html`) whenever you change CSS/JS, or the change will not appear for returning visitors. Grep for `?v=` to find them.

## Public site architecture

- **`index.html`** is one large file containing every section (hero, services, work/`bm-clients`, process, FAQ, contact, footer). Some sections (notably the dark "Brands We Have Built" block, `.bm-clients`) carry their own scoped `<style>` block inline.
- **`styles.css`** (~2800 lines) is **design-token driven**. Brand tokens live at the top (`:root`). Palette: Mint 3 `#10B981` (primary), Paper `#F5F1EA`, Ink `#0A0E0C`, dark-interlude `#0B1F1A` + Emerald `#00C897`, Gold `#C9A14A` (editorial accent only). Fonts: **Plus Jakarta Sans** (display), **Inter** (body), **JetBrains Mono** (all numerals).
- **`script.js`** is a single IIFE. Two flags gate everything animated: `reduceMotion` (`prefers-reduced-motion`) and `isFinePointer`. The "premium motion layer" (staggered reveals, hero entrance, count-up stats, magnetic buttons, scroll-progress bar, cursor ring, and the **scroll-velocity-driven marquee + 3D logo**) lives at the end of the IIFE. **Any new motion must be guarded by these flags**, and `@media (prefers-reduced-motion: reduce)` in `styles.css` must explicitly disable looping animations (set `animation: none`) to avoid rapid-loop flicker.
- **Auth** (`auth/marketing.js`) exposes `window.bmAuth`. It **lazy-loads Firebase**: a signed-out visitor fetches zero SDK, and initialisation is deferred until there's a cached session hint, an auth callback in the URL, or the visitor clicks a `[data-auth-action]` control. `index.html` has an **inline auth-preflight script** that sets `data-auth-state` / `data-auth-role` on `<html>` before first paint so the nav never flashes the wrong state. Nav visibility is driven by `[data-auth-show="signed-in|signed-out"]` and actions by `[data-auth-action]`.
- **Contact form**: on submit it (1) fires a non-blocking insert into the Firestore `leads` collection **via the REST API** — deliberately not the SDK, so the marketing page never pays ~300KB for it — and (2) opens WhatsApp (`https://wa.me/917799934943`) with the inquiry prefilled. The studio's contact phone link also points at this WhatsApp number.

## Admin CRM architecture (`admin/`)

- **Auth is real Firebase Auth** (Google + passwordless email link), gated by `requireRole('admin')` in `auth/session.js`. The role is read from the `profiles` collection, never from a custom claim or a field the client can write. `admin/auth.js` is a thin adapter over the shared session; the old shared-passcode gate and the three hard-coded demo accounts are gone. The inline preflight in `admin.html` is a first-paint optimisation only — the boundary is RLS.
- **`admin/app.js`** — hash router. Routes lazy-import modules from `admin/modules/*.js` (dashboard, leads, pipeline, clients, invoices, content, metrics, brand-kit, documents, settings). Keyboard nav (`g` + key) and `⌘/Ctrl-K` palette.
- **`admin/db.js`** — the data layer and the most important file to understand. It keeps a **synchronous in-memory `cache`** so modules can call `db.list()` during render without awaiting. `hydrate()` attaches one `onSnapshot` per collection; the first callback fills the cache and every later one keeps it live, so hydration and realtime are a single mechanism. Writes patch the cache immediately, then **fire-and-forget** to Firestore (which queues them when offline; a genuine rejection is almost always a rules denial). `seedIfEmpty()` still exists but is **no longer called on boot** — run `bm.seed()` from the console if you want the demo set.
- **`firebase/app.js`** — the one place the SDK is loaded. It uses `initializeAuth` with `browserLocalPersistence` (not `getAuth`) so the session lands in localStorage: Firebase's default IndexedDB persistence is async and would break the synchronous first-paint preflight. Firestore uses `persistentLocalCache`, which replaced the old hand-rolled localStorage mirror. **`firebase/config.js`** holds the web config and the pinned SDK version.
- **`admin/db.js`** hydration and realtime are now the same mechanism: one `onSnapshot` per collection, whose first callback fills the cache. No case conversion — Firestore stores the app's camelCase as-is. Add new collections to both `COLLECTIONS` and `cache`.
- New admin modules: **`onboarding.js`** (invite a client, watch the four-stage funnel, read their brief, kick the project off) and **`delivery.js`** (per-client milestones, deliverables with the client's approve/revise verdict, and the message thread).

## Firebase

- All three apps share one project. The **web `apiKey` is shipped in client source** (`firebase/config.js`, `script.js`) — it is a project identifier, not a credential. **`firestore.rules` is the only security boundary.**
- Collections: `leads`, `projects`, `clients`, `invoices`, `content`, a singleton `settings/singleton` document, plus `profiles`, `clientUsers`, `invites`, `onboardingResponses`, `milestones`, `deliverables` and `messages`. Every scoped document carries `clientId` — rules cannot join, so it is denormalized deliberately.
- **Rules filter documents, not queries.** A client-side query that isn't already constrained to what the rules allow is rejected outright, not narrowed. Every portal read carries its own `where("clientId","==",...)`; dropping one produces a permission error, not a silent leak.
- **`firestore.rules`** replaces every RLS policy. `isAdmin()` / `isMember()` / `canSee()` mirror the old SQL helpers; `diff().affectedKeys().hasOnly([...])` replaces the three `BEFORE` triggers that stopped a client escalating their role, rewriting a deliverable while "approving" it, or posting as the agency. Each `get()`/`exists()` in a rule is a billed read with a fixed per-request budget.
- **Invite document IDs must be `{lowercased email}_{clientId}`** — the membership-claim rule proves an invite exists with a single `exists()` on that exact path. `admin/modules/onboarding.js` builds it; a random ID would make every client sign-in fail.
- The signup trigger has no Firestore equivalent: `claimPendingInvites()` in `auth/session.js` does it client-side, and the rules only permit the write for a **verified** email with a matching invite. This is what keeps the project on the free Spark plan (no Cloud Functions).
- **`SETUP-FIREBASE.md`** is the operator checklist: paste the web config, create the database, publish the rules, enable sign-in, promote the first admin, onboard a client.

## Non-code directories

- `brand-kit/` — logo SVGs and `BRAND-GUIDELINES.md` (palette, type, logo placement, voice).
- `brand-mint-admin/` — business/ops markdown docs (strategy, pricing, contracts). Reference, not code.
- `marketing/` — campaign assets generated for the studio (video prompts, identity-kit PDF, social carousel, VO scripts). Assets, not code.
- `BUILD-PLAYBOOK.md` and `COMPONENTS.md` — the design system and copy-paste component recipes. **Read these before adding or restyling any UI section** so new work matches the established tokens and patterns.
