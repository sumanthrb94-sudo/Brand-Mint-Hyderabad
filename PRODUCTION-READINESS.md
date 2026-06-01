# Production Readiness Report — Brand Mint

**Date:** 2026-06-01
**Scope reviewed:** Public marketing site (`index.html`, `styles.css`, `script.js`, `auth/`), admin SPA (`admin/`, `admin.html`), Supabase data layer, Vercel config.
**Stack:** Static HTML/CSS/JS, no build step. Supabase (Postgres + Auth) as backend. Deployed on Vercel. `supabase-js` loaded at runtime from `esm.sh`.

---

## Verdict

| Surface | Status |
|---|---|
| **Public marketing site** | 🟡 **Ship-able** with minor SEO/headers fixes |
| **Public magic-link auth** | 🟡 **Functional**, hardened CDN/RLS needed |
| **Admin CRM (`/admin.html`)** | 🔴 **NOT production-ready** — unauthenticated, all business data exposed |

**Bottom line:** The marketing site is essentially fine to publish. The **admin panel must not be considered live** until the authentication and Supabase RLS issues below are fixed — as it stands, every lead, client contact, invoice, the studio's bank account number + IFSC, and pricing floors are reachable by anyone who opens `/admin.html`.

---

## 🔴 Critical (block production)

### C1 — The admin panel has no authentication
- `admin.html:29-38` injects a fake 1-year session into `localStorage` on page load.
- `admin/app.js:149` calls `boot()` unconditionally with the comment *"Auth disabled — always boot straight into the dashboard."*
- The login gate (`admin/auth.js`) and Settings passcode UI still exist but are **completely bypassed**.
- The only access control is `<meta name="robots" content="noindex,nofollow">` (`admin.html:6`) — security by obscurity, not security.

**Impact:** Anyone who navigates to `https://<site>/admin.html` lands directly in the dashboard with full CRUD over leads (names, emails, phones, deal notes), clients, invoices, **bank account number + IFSC** (`admin/modules/settings.js:240-272`), and pricing.

### C2 — Supabase `anon` key is the only security boundary, and it must allow full CRUD
- The admin client uses the publishable **anon** key with `auth: { persistSession: false }` (`admin/supabase.js:23-26`) — i.e. **no user-level authentication**. Every read/write executes as the `anon` Postgres role.
- For the admin to function (list/create/update/delete across `leads`, `projects`, `clients`, `invoices`, `content`, `settings`), RLS must grant `anon` broad read+write. The anon key is shipped in client source (`admin/config.js`, `script.js`, `auth/marketing.js`), so it is public.
- **Net effect:** if RLS is open enough to make the admin work, anyone on the internet can read, modify, and delete all business data directly against the REST API — no UI needed.

> **Action required:** Verify the live RLS policies (`select / insert / update / delete` per table for the `anon` role). The correct design is:
> - Public site `leads` table → **INSERT-only** policy for `anon` (the contact form in `script.js:81-96`).
> - Admin tables → **authenticated-only** policies, and the admin must sign in (Supabase Auth) so requests carry a user JWT instead of the raw anon key. Re-enable the auth gate accordingly.

### C3 — Seed data writes demo records into the live database
- `seedIfEmpty()` (`admin/db.js:340-613`) runs on every boot and, when the cache looks empty, calls `db.create(...)` for 5 fake leads, 4 projects, 4 clients, and 3 invoices. `db.create` fires `pushInsert` to Supabase (`admin/db.js:236-247, 156-170`).
- On a fresh production database this **pollutes real tables with demo data** (e.g. "Aarav Mehta", "Nimbus AI", invoices `BM-2026-001..003`), and seeds placeholder bank/GST values (`00000000000000`, `36ABCDE1234F1Z5`).

> **Action required:** Gate seeding to a local/dev flag, or remove it before go-live.

---

## 🟠 High

### H1 — Runtime dependency on a third-party CDN (esm.sh), unpinned, no SRI
- Both the public auth (`auth/marketing.js:22`) and the admin (`admin/supabase.js:21`) import `supabase-js` from `https://esm.sh/@supabase/supabase-js@2` at runtime.
- Pinned only to the **major** version `@2` and served with **no Subresource Integrity**. An esm.sh outage takes down login and all DB sync; a CDN compromise could inject code that runs with full page privileges (and reads the session token).

> **Action:** Pin an exact version, add SRI where possible, or vendor the library into the repo. Add a CSP (see M2) that constrains script sources.

### H2 — Passcode scheme is weak (latent, re-enable risk)
Even though it's currently bypassed, the passcode logic in `admin/auth.js` ships in the repo and is the intended gate:
- Unsalted SHA-256, computed client-side, hash stored in `localStorage` (`auth.js:14-29`).
- Hardcoded default passcode `brandmint2026` in source (`auth.js:11`) and documented in `settings.js:332`.
- `verify()` also accepts `trim()` and `toLowerCase()` variants (`auth.js:35`), shrinking the keyspace.
- A client-side passcode is not a real authentication boundary regardless — it can be inspected/bypassed in devtools.

> **Action:** Replace with Supabase Auth (already used on the public site) for the admin, scoped to an allowlist of authorized emails. Remove the hardcoded default.

---

## 🟡 Medium

### M1 — Offline-first sync has no retry queue or conflict resolution
- Writes are fire-and-forget (`admin/db.js:156-209`). On push failure the local cache and Supabase **silently diverge**; only a `syncErrors` counter increments (`recordFailure`). There is no replay/retry of failed writes and no reconciliation on next boot beyond a full overwrite from remote (`hydrate`).
- Multi-device editing is last-write-wins with no `updated_at` conflict check. Edits made offline on device A can be clobbered by a stale hydrate.

> **Action:** Add a durable outbox (queue failed mutations, retry on reconnect) and surface unsynced state clearly. At minimum, document the single-device assumption.

### M2 — Missing security headers (CSP, HSTS)
- `vercel.json` sets `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` — good — but **no `Content-Security-Policy`** and **no `Strict-Transport-Security`**.
- Note: a strict CSP will require addressing the esm.sh imports (H1), Google Fonts, and the heavy use of inline styles/SVG in the admin's `h()` helper.

> **Action:** Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and a CSP scoped to the actual script/style/font/connect origins (`*.supabase.co`, `esm.sh`, `fonts.googleapis.com`, `fonts.gstatic.com`).

### M3 — Open Graph / canonical URLs point to the hashed Vercel slug
- `index.html` canonical + OG + Twitter image URLs all reference `https://brand-mint-sdmk.vercel.app/`. `REPO-INFO.md` documents that this slug breaks social link previews (WhatsApp/LinkedIn/X) and recommends a clean project rename or custom domain.

> **Action:** Point these four tags at the final production domain before launch (see `REPO-INFO.md §4c`).

### M4 — No `robots.txt` or `sitemap.xml`
- The marketing site has neither. The admin relies on a `noindex` meta tag rather than a `robots.txt` `Disallow`.

> **Action:** Add `sitemap.xml` for the public site and a `robots.txt` that disallows `/admin*` and `/auth/`.

---

## 🟢 Low / Process

- **L1 — No tests, no CI/CD, no linting.** No `package.json`, `.github/`, or lint config exists. Even for a no-build static site, an HTML/link/headers smoke check on deploy would catch regressions.
- **L2 — Google Fonts loaded from Google's CDN** (`index.html`, `admin.html`) — render-blocking and a GDPR/privacy consideration for EU visitors. Consider self-hosting the WOFF2 files.
- **L3 — No production observability.** No error monitoring (e.g. Sentry) or analytics; client-side DB push failures only reach `console.error`. The CEO would have no signal that sync is failing.
- **L4 — Placeholder business data in seed.** Bank account `00000000000000`, GSTIN `36ABCDE1234F1Z5`, phone `+91 00000 00000` (`admin/db.js:343-361`) would render on invoices/contracts if not overwritten.
- **L5 — Repo/branch hygiene.** Default working branch is `claude/build-brand-mint-website-29WAg` rather than `main`; repo name historically carried a trailing dot (documented in `REPO-INFO.md`). Settle on `main` as the deploy branch.

---

## Recommended pre-launch checklist

**Must fix before admin goes live (Critical):**
- [ ] Re-enable real authentication for `/admin.html` (Supabase Auth + email allowlist); remove the fake-session injection in `admin.html`.
- [ ] Audit and lock down Supabase RLS: `anon` = INSERT-only on `leads`; all other tables authenticated-only.
- [ ] Disable/guard `seedIfEmpty()` so demo data never reaches production.

**Should fix before/shortly after launch (High/Medium):**
- [ ] Pin/vendor `supabase-js`; add SRI or a CSP that constrains it.
- [ ] Add `Content-Security-Policy` and `Strict-Transport-Security` headers.
- [ ] Point OG/canonical URLs at the production domain.
- [ ] Add `robots.txt` (disallow `/admin*`) and `sitemap.xml`.
- [ ] Add a failed-write retry/outbox to the sync layer (or document single-device use).

**Nice to have (Low):**
- [ ] Self-host fonts; add error monitoring; add a deploy smoke check; replace placeholder bank/GST values; standardize on a `main` deploy branch.

---

*This report is documentation only — no application code was modified.*
