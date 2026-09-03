# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Brand Mint is the marketing site **and** internal admin CRM for a Hyderabad design studio. It is a **static HTML/CSS/JS site with no build step** — files are served as-is. The backend is **Supabase** (Postgres + Auth), and `supabase-js` is loaded at runtime from `https://esm.sh/@supabase/supabase-js@2` (no bundler, no npm dependencies). Deployed on **Vercel**.

There are three apps in one repo, sharing one Supabase project and one auth session:
- **Public marketing site** — `index.html` + `styles.css` + `script.js` + `auth/marketing.js`
- **Admin CRM SPA** — `admin.html` + `admin/` (ES-module app with a hash router and offline-first Supabase layer). Requires `profiles.role = 'admin'`.
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
- `vercel.json` sets `cleanUrls`, security headers, and caches `styles.css`/`script.js` for 1h. **You MUST bump the `?v=` query string** on the `<link>`/`<script>` refs in `index.html` (and the `?v=` on `admin/*` refs in `admin.html`) whenever you change CSS/JS, or the change will not appear for returning visitors. Grep for `?v=` to find them.

## Public site architecture

- **`index.html`** is one large file containing every section (hero, services, work/`bm-clients`, process, FAQ, contact, footer). Some sections (notably the dark "Brands We Have Built" block, `.bm-clients`) carry their own scoped `<style>` block inline.
- **`styles.css`** (~2800 lines) is **design-token driven**. Brand tokens live at the top (`:root`). Palette: Mint 3 `#10B981` (primary), Paper `#F5F1EA`, Ink `#0A0E0C`, dark-interlude `#0B1F1A` + Emerald `#00C897`, Gold `#C9A14A` (editorial accent only). Fonts: **Plus Jakarta Sans** (display), **Inter** (body), **JetBrains Mono** (all numerals).
- **`script.js`** is a single IIFE. Two flags gate everything animated: `reduceMotion` (`prefers-reduced-motion`) and `isFinePointer`. The "premium motion layer" (staggered reveals, hero entrance, count-up stats, magnetic buttons, scroll-progress bar, cursor ring, and the **scroll-velocity-driven marquee + 3D logo**) lives at the end of the IIFE. **Any new motion must be guarded by these flags**, and `@media (prefers-reduced-motion: reduce)` in `styles.css` must explicitly disable looping animations (set `animation: none`) to avoid rapid-loop flicker.
- **Auth** (`auth/marketing.js`) exposes `window.bmAuth` (Supabase magic-link / OTP, `persistSession: true`). `index.html` has an **inline auth-preflight script** that sets `data-auth-state` / `data-auth-role` on `<html>` before first paint so the nav never flashes the wrong state. Nav visibility is driven by `[data-auth-show="signed-in|signed-out"]` and actions by `[data-auth-action]`.
- **Contact form**: on submit it (1) fires a non-blocking insert into the Supabase `leads` table and (2) opens WhatsApp (`https://wa.me/917799934943`) with the inquiry prefilled. The studio's contact phone link also points at this WhatsApp number.

## Admin CRM architecture (`admin/`)

- **Auth is real Supabase Auth** (Google OAuth + email magic link), gated by `requireRole('admin')` in `auth/session.js`. The role is read from the `profiles` table, never from `user_metadata` — a user can rewrite their own metadata through the SDK, so a metadata check is not a security check. `admin/auth.js` is a thin adapter over the shared session; the old shared-passcode gate and the three hard-coded demo accounts are gone. The inline preflight in `admin.html` is a first-paint optimisation only — the boundary is RLS.
- **`admin/app.js`** — hash router. Routes lazy-import modules from `admin/modules/*.js` (dashboard, leads, pipeline, clients, invoices, content, metrics, brand-kit, documents, settings). Keyboard nav (`g` + key) and `⌘/Ctrl-K` palette.
- **`admin/db.js`** — the offline-first data layer and the most important file to understand. It keeps a **synchronous in-memory `cache`** (so modules stay sync) mirrored to `localStorage` (namespace `bm.admin.v2.`). On boot it hydrates from Supabase; writes patch the cache + localStorage immediately, then **fire-and-forget push** to Supabase (failures only increment a counter — local and remote can silently diverge). It auto-converts **camelCase (app) ↔ snake_case (DB)** at the row boundary and subscribes to Postgres Changes for realtime. `seedIfEmpty()` writes demo leads/clients/invoices on first run.
- **`admin/supabase.js`** — delegates to the shared authenticated client in `auth/session.js`. It must NOT create its own client: a second client with `persistSession: false` sends every query as the anonymous role, which under RLS returns nothing. `admin/config.js` holds `SUPABASE_URL` + the publishable anon key.
- **`admin/db.js` collections** map to Postgres tables via a `TABLE` lookup, because the app speaks camelCase (`onboardingResponses`) and the DB speaks snake_case (`onboarding_responses`). Add new collections to both `COLLECTIONS` and `cache`.
- New admin modules: **`onboarding.js`** (invite a client, watch the four-stage funnel, read their brief, kick the project off) and **`delivery.js`** (per-client milestones, deliverables with the client's approve/revise verdict, and the message thread).

## Supabase

- All three apps share the same project (ref `ycdfgtljxqrhyobnwwbz`). The **anon key is shipped in client source** (`admin/config.js`, `script.js`, `auth/session.js`) — **RLS policies are the only security boundary**.
- Tables: `leads`, `projects`, `clients`, `invoices`, `content`, a singleton `settings` row, plus `profiles`, `client_users`, `invites`, `onboarding_responses`, `milestones`, `deliverables` and `messages`.
- The schema and every RLS policy live in **`supabase/migrations/0001_auth_portal_onboarding.sql`** — idempotent, run by hand in the SQL editor. Helper functions `is_admin()`, `my_client_ids()` and `can_see_client()` are `SECURITY DEFINER` because the policies call them (a plain function would recurse on `profiles`). `BEFORE` triggers stop a client escalating their own role, rewriting a deliverable while "approving" it, or posting a message stamped as the agency.
- **`SETUP-AUTH.md`** is the operator checklist: run the migration, set redirect URLs, enable Google, promote the first admin, onboard a client.

## Non-code directories

- `brand-kit/` — logo SVGs and `BRAND-GUIDELINES.md` (palette, type, logo placement, voice).
- `brand-mint-admin/` — business/ops markdown docs (strategy, pricing, contracts). Reference, not code.
- `marketing/` — campaign assets generated for the studio (video prompts, identity-kit PDF, social carousel, VO scripts). Assets, not code.
- `BUILD-PLAYBOOK.md` and `COMPONENTS.md` — the design system and copy-paste component recipes. **Read these before adding or restyling any UI section** so new work matches the established tokens and patterns.
