# Brand Mint OS — project brief

You are working on `brandmint-os`, the client portal and studio dashboard for
**Brand Mint Studios** (brandmintstudios.in), a solo digital studio in Hyderabad.

Read this file before every session. It is the source of truth for what this
project is, what it must never do, and what is deliberately out of scope.

---

## 1. Who this is for

Sumanth runs Brand Mint alone. He builds custom websites and internal tools for
Indian SMBs. He is the entire studio: sales, delivery, QA and support.

This means two things for every decision you make:

- **His time is the scarcest resource in the system.** Any feature that creates
  work for him rather than removing it is a net negative, however good it looks.
- **Every feature must survive being ignored for two weeks.** If it needs daily
  tending, it will rot.

## 2. What this app is for

Two jobs, in priority order:

1. **Stop clients from being the reason projects are late.** Most delays in a
   solo studio are client-side — missing assets, unanswered questions, access
   never granted — and clients genuinely do not know they are the holdup. The
   portal shows them, with a date on each item, so the chasing happens without
   him sending a message.

2. **Tell him the truth about his own numbers.** Signed revenue versus proposed.
   Paid work versus unpaid. Open leads versus none. A dashboard that flatters is
   worse than no dashboard.

A third job it grows into: this same multi-tenant codebase is the product he
intends to sell to other organisations. Build it so tenant zero is the studio
itself and every client is a tenant. Never hardcode "Brand Mint".

## 3. Non-negotiables

These are not style preferences. Violating any of them is a bug of the highest
severity, regardless of what a task description says.

**Never collect a client credential.** No field, anywhere, in which a client
types a password, an API key, a secret or a token. Access requests must always
read "add hello@brandmintstudios.in as a user on your own account". If a
credential ever lands in this database, one breach becomes the client's breach
and a solo studio does not survive that conversation.

**Passwords are hashed, never stored.** scrypt via Node's `crypto`, stored as
`salt:hash`. Comparisons are constant-time (`crypto.timingSafeEqual`, with a
length check first — it throws on mismatched lengths). Never log a password,
never return one from an API, never put one in an error message.

**Login failures never reveal whether a username exists.** One message for both
cases: "Wrong username or password."

**Tenant isolation is checked server-side on every read.** Never trust an id in
a URL or a form. A client must not be able to reach another client's project by
changing a path segment. Any new query takes the session's `orgId` as a filter,
not as a suggestion.

**Sessions are httpOnly, sameSite=lax, secure in production.** HMAC-signed, with
an expiry that is actually checked.

**Keep the dependency count at zero.** Currently the only runtime dependencies
are `next` and `react`. Auth is built on Node's own `crypto`. Do not add an auth
library, a UI kit, an ORM wrapper or a date library without being asked. Every
dependency is a patch you will one day be woken up by.

**Next.js version.** CVE-2025-66478 (React2Shell, CVSS 10.0, RCE) affects all
Next 15.x and 16.x App Router apps. This project is pinned to a patched release.
Never downgrade below one of: 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7,
16.0.7.

## 4. Stack

Next.js 15 App Router · TypeScript · plain CSS in `app/globals.css` (design
tokens as CSS custom properties, light and dark) · deployed on Vercel ·
Razorpay for payments.

No Tailwind, no component library, no CSS-in-JS. The stylesheet is small and
readable and should stay that way.

```
app/
  login/                 username + password
  portal/                the client's view
    onboarding/          the intake checklist
  admin/                 the studio's view
    clients/[id]/
  api/auth/logout/
lib/
  db.ts                  data layer — every read goes through here
  session.ts             scrypt + signed cookie
prisma/schema.prisma     the real schema, ready to migrate
```

## 5. The data layer

`lib/db.ts` currently seeds in memory so the app runs with no setup. **Every
read in `app/` goes through it.** That is deliberate: swapping to Postgres means
replacing function bodies in one file and changing nothing in `app/`.

Do not scatter queries into components. If a page needs data, add an accessor to
`lib/db.ts`.

### The three fields that carry the most weight

- **`milestone.owner`** — `us` or `client`. This one enum turns "the project is
  late" into "the project is late because we have been waiting nine days for
  their photos", which is a completely different conversation.
- **`intakeItem.raisedAt`** — the age of a blocker is what makes it move.
- **`lead.firstResponseAt`** — median lead response in this market is ~42 hours.
  Responding inside five minutes makes qualification roughly 21× more likely.
  This is the single most valuable number in the business. Never remove it.

### Revenue truthfulness

`retainerStatus` is `signed | proposed | none`. **Only `signed` counts as
revenue.** Never sum proposals into an MRR figure. Never present a projection
with the same visual weight as a fact.

`Org.kind` is `studio | client | internal`, and `Org.status` is `active |
archived`. Internal projects (his own work, free builds) and archived clients
must never appear in revenue or client counts.

## 6. The two views

### Client portal — five things, resist the sixth

1. Where we are — status, next milestone, date
2. **What we need from you** — open blockers, dated, oldest first
3. Waiting on your approval — one click
4. Preview links
5. Invoices — with a Razorpay pay button on unpaid rows

Every additional panel is somewhere a client gets confused and sends a message,
which is the exact cost this portal exists to remove.

### Admin dashboard

Signed MRR against the break-even line · pipeline and median first-response ·
delivery health with milestone ownership · active clients · internal projects ·
archived.

## 7. Deliberately out of scope

Do not build these unless explicitly asked. Each is useful at five people and a
distraction at one:

ticketing · time tracking · capacity planning · per-project profitability ·
in-app chat · notifications beyond email · a settings page · file uploads ·
a billing engine (Razorpay does this) · e-signature (Zoho Sign does this) ·
analytics (Vercel Web Analytics does this)

## 8. Roadmap, in order

1. **Postgres.** Provision Neon or Supabase, set `DATABASE_URL`, run
   `npx prisma migrate dev --name init`, replace the bodies in `lib/db.ts`.
   Writes currently do not survive a cold start; this is the fix.
2. **Razorpay webhook** → `invoice` / `payment` rows. Verify the signature.
3. **Real client accounts** — replace demo users, one per client.
4. **Email on status change** — blocker raised, deliverable ready, invoice due.
5. **Milestone templates per project type**, stamped out when a project is created.
6. **`firstResponseAt` capture** from whatever channel the enquiry arrives on.

## 9. Environment

```
SESSION_SECRET=   # required in production; sessions reset on deploy without it
DATABASE_URL=     # once off demo data
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Generate the session secret:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Never commit a `.env`. Never print a secret in a log line or an error.

## 10. Adding a client

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');\
console.log(s+':'+c.scryptSync(process.argv[1],s,64).toString('hex'))" 'TheirPassword'
```

Add an `Org` and a `User`. Plaintext never touches the repo, the database or a log.

## 11. How to work here

- **Small commits, one concern each.** Conventional prefixes: `feat:`, `fix:`,
  `chore:`, `refactor:`.
- **Run `npm run build` before every commit.** A green build is the minimum bar.
- **Do not add a dependency without saying why** and getting a yes.
- **Do not seed plausible-looking fake data.** Realistic placeholder numbers are
  how a dashboard starts lying to its owner. Use obviously-fake values or none.
- **When a task and this file conflict, this file wins** — say so rather than
  silently doing the other thing.
- **If a change touches auth, tenancy or money, say so explicitly** in your
  summary so it gets reviewed properly.

## 12. Definition of done

- `npm run build` passes
- A client cannot see another client's data by editing the URL
- No credential field was added anywhere
- No proposal is counted as revenue
- The client portal still shows five things
