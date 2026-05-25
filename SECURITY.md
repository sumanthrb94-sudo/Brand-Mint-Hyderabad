# Security Model

Reference for the security posture of brandmintstudios.in and the embedded `/admin` panel.

## Threat model

| Asset | Sensitivity | Protection |
|-------|-------------|-----------|
| Public site (`/`, `/index.html`, public assets) | Low | Indexable, public. |
| Contact form submissions | Medium (PII) | Sent to Supabase + Gmail via Formsubmit (HTTPS only). |
| Admin panel UI (`/admin.html`, `/admin/*`) | Medium | `noindex`, no-cache, frame-denied; client gate; Supabase auth required to load data. |
| Lead / client / invoice data | **High** | Server-side RLS in Supabase (NOT the client-side gate). |
| Auth credentials | **High** | Supabase Auth (email+password, hashed server-side). No password ever stored in repo. |

## What protects /admin

### 1. Defense in depth (HTTP)
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` — prevents Google/Bing from indexing or caching admin URLs.
- `X-Frame-Options: DENY` — prevents clickjacking via iframe embed.
- `Cache-Control: private, no-store, max-age=0` — admin pages never enter shared caches/CDNs.
- `Content-Security-Policy` — strict allowlist; admin scripts can only load from `self`, `esm.sh`, fonts.googleapis.com; data only flows to the Supabase project URL. Blocks data exfiltration via XSS.
- `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Resource-Policy: same-origin` — process isolation against Spectre-class attacks.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — HTTPS-only forever.

### 2. Robots
- `/robots.txt` explicitly disallows `/admin`, `/admin/`, `/admin.html`.
- `<meta name="robots" content="noindex,nofollow">` set on `admin.html`.

### 3. Client-side auth gate
- `/admin.html` shows a Supabase email+password form before mounting the app.
- App data (`db.hydrate()`) does NOT run until a session is established.
- Login requires the user to (a) authenticate with Supabase **AND** (b) have a row in the `public.admins` allowlist table (verified via `auth.uid()` lookup, enforced by RLS).

### 4. Server-side authorisation (the real boundary)
The client-side gate is a UX layer, not a security boundary. The **actual** security is enforced by Supabase Row-Level Security policies. Even if an attacker bypasses the JS gate and calls Supabase directly with the public anon key:

- All sensitive tables (`leads`, `clients`, `invoices`, `admins`, etc.) MUST have RLS enabled.
- The policy must check `auth.uid() IN (SELECT user_id FROM admins)` for SELECT / INSERT / UPDATE / DELETE.
- Without a valid admin session, every query returns zero rows or fails.

**This is verified in the Supabase dashboard. Audit checklist:**
- [ ] RLS enabled on `leads`
- [ ] RLS enabled on `clients`
- [ ] RLS enabled on `invoices`
- [ ] RLS enabled on `admins` (and `admins` is only writeable by `service_role`, never the anon role)
- [ ] No policy uses `USING (true)` or similar wildcards

If RLS is disabled or misconfigured, the anon key alone is enough to read everything. **Verify in dashboard → Database → Tables → each table → Policies.**

## What is intentionally public (and safe)

- **`SUPABASE_ANON_KEY`** (in `admin/config.js`). The anon/publishable key is designed to be shipped to browsers. RLS is the security layer. Compromised only if RLS is missing or broken.
- **`SUPABASE_URL`**. The project URL is identifying but not secret.
- **`/admin/*.js` source files**. JavaScript on a static site is always fetchable. The auth logic visible there is intentional — security depends on Supabase server-side enforcement, not on hiding the gate code.

## What is NEVER in the repo

- ❌ `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS. Stays in Supabase dashboard / Vercel env vars only, **never** in client code.
- ❌ User passwords (Supabase Auth hashes them server-side).
- ❌ `.env` files with live secrets (gitignored).
- ❌ Personal/identifiable client data in seed files (`admin/db.js` contains clearly-fake demo names like "Lume", "Nimbus AI" — not real client emails).

## Contact form security

- **Transport.** All submissions go over HTTPS (Supabase + Formsubmit).
- **Email destination.** `brandmint.studios.in@gmail.com` — verified once via Formsubmit confirmation.
- **CAPTCHA.** Disabled at the Formsubmit layer to keep UX simple; honeypot can be added if spam appears (`_honey` field per Formsubmit docs).
- **No backend code.** Form posts directly from browser to Supabase (RLS-enforced) and Formsubmit (public POST). No custom server to hack.

## If you suspect compromise

1. **Rotate the Supabase anon key.** Dashboard → Settings → API → Roll publishable key. Update `admin/config.js`.
2. **Force sign-out every admin user.** Dashboard → Authentication → Users → for each: "Revoke all sessions".
3. **Reset admin passwords.** Send password reset emails via Supabase Auth.
4. **Audit RLS policies.** Run the checklist above.
5. **Check the `admins` allowlist table for unexpected rows.** Remove anything not on the staff list.
6. **Review recent INSERT/UPDATE/DELETE logs** in Supabase → Database → Logs.

## What is NOT in scope

- DDoS / volumetric attacks — handled by Vercel's edge infrastructure (Anycast + rate limits).
- Email impersonation of `brandmint.studios.in@gmail.com` — covered by Gmail's SPF/DKIM (no custom DMARC needed since we don't send from a custom domain).
- Physical / social engineering — staff training.

---

*Last reviewed: ongoing. If you change `vercel.json`, `admin/config.js`, or any Supabase RLS policy, re-read this file and update the audit checklist.*
