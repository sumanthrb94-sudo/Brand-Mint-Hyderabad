# Brand Mint OS

Client portal + studio dashboard. Next.js 15, App Router, TypeScript.
**Zero runtime dependencies beyond Next and React** — auth is built on Node's own
`crypto`, so there is nothing to install, patch or pay for.

```
app/
  login/                 username + password
  portal/                what the client sees
    onboarding/          the intake checklist — the whole point
  admin/                 your view
    clients/[id]/        one client, everything
  api/auth/logout/
lib/
  db.ts                  data layer (demo seed — swap for Prisma)
  session.ts             scrypt hashing + signed session cookie
prisma/schema.prisma     the real schema, ready to migrate
```

## Run it

```bash
npm install
npm run dev
```

## Logins

| Username | Password | Sees |
|---|---|---|
| `admin` | `BrandMint@2026` | Studio dashboard |
| `greenbasket` | `GreenBasket@2026` | Green Basket portal |
| `tresor` | `Tresor@2026` | Tresor Couture portal |
| `mpmuk` | `MobilePhone@2026` | Mobile Phone Market portal |

**Change every one of these before you send the URL to a client.**

## Adding a client

1. Mint a hash:

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');\
console.log(s+':'+c.scryptSync(process.argv[1],s,64).toString('hex'))" 'TheirPassword'
```

2. Add an `Org` and a `User` to the seed arrays in `lib/db.ts` (or insert rows once
   you're on Postgres). Passwords are stored as `salt:hash` — **plaintext never
   touches the database, the logs, or this repo.**

## Environment

```
SESSION_SECRET=   # required in production — any long random string
DATABASE_URL=     # only when you move off demo data
```

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Without `SESSION_SECRET` the app still runs, but sessions reset on every deploy.

## Demo mode

`lib/db.ts` seeds in memory. Reads work; **writes do not survive a cold start.**
Approving a deliverable or ticking an intake item works in the session and then
resets. That is deliberate — it lets you click through the whole thing before
committing to a database.

## Moving to Postgres

1. Provision Postgres (Neon, Supabase, Vercel Postgres).
2. Set `DATABASE_URL`.
3. `npx prisma migrate dev --name init`
4. Replace the function bodies in `lib/db.ts` with Prisma queries.

Every read in `app/` goes through `lib/db.ts`, so **nothing in `app/` changes.**
That is the only reason the swap is a morning's work rather than a rewrite.

## Deploying

Push to GitHub; Vercel builds on commit. Set `SESSION_SECRET` in
Project → Settings → Environment Variables, then point a subdomain
(`app.brandmintstudios.in`) at the project.

## Two rules that are not style preferences

**Never collect a client credential.** The onboarding flow asks clients to add
you as a user on their own systems. It must never contain a field where someone
types a password or an API key. If a client credential lands in your database,
one breach becomes their breach.

**Instrument `firstResponseAt` before anything else.** Median lead response in
this market is measured in days. Yours should be measured in minutes, and you
cannot improve what you are not recording.

## What's deliberately missing

Ticketing, capacity planning, time tracking, profitability per project. All
useful at five people. At one person they are a dashboard you look at instead
of selling. Run on these two views for a month, then add what you actually
reached for.
