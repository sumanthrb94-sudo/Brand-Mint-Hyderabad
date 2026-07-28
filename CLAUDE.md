# Brand Mint — working agreement

This repo is **two things in one**: the live marketing site at `/`, and the
client portal that grew inside it. Read this before changing anything.

Where this file and a task description disagree, **this file wins — say so
rather than silently doing the other thing.**

---

## 1. What the portal is for

Brand Mint Studios is a solo studio. Sumanth is sales, delivery, QA and
support. Two consequences govern every decision:

- **His time is the scarcest resource.** A feature that makes work for him
  rather than removing it is a net negative however good it looks.
- **Every feature must survive being ignored for two weeks.** If it needs
  daily tending it will rot.

The portal does two jobs, in priority order:

1. **Stop clients being the reason projects are late.** Most delay in a solo
   studio is client-side — missing assets, unanswered questions, access never
   granted — and clients genuinely do not know they are the holdup. The portal
   shows them, dated, so the chasing happens without him sending a message.
2. **Tell him the truth about his own numbers.** Signed revenue versus
   proposed. Paid versus unpaid. Open leads versus none. **A dashboard that
   flatters is worse than none.**

It is multi-tenant by design: tenant zero is the studio, every client is a
tenant, and he intends to sell it. **Never hardcode "Brand Mint"** as a
tenant concept. (Known debt: `ADMIN_EMAIL` and the admin's `brandmint` orgId
are hardcoded in `bm-app.js`, and the admin email is hardcoded in
`firestore.rules`. That is deliberate for now — see §7 — but it is the first
thing to fix before this ships to a second studio.)

---

## 2. Where everything lives

| Thing | Value |
|---|---|
| Repo | `sumanthrb94-sudo/Brand-Mint-Hyderabad` (public) |
| Branch production runs from | `claude/new-session-glceza` |
| Vercel project | `brand-mint-sdmk`, team `sumanthrb94-3803s-projects` |
| Root Directory | `.` — no build step, static file serve |
| Domains | `brandmintstudios.in` + `www.` (**www actually serves**; apex redirects) |
| Firebase project | `brandmintstudios-a5eb7` |
| Firestore | live, Standard, `asia-south1` (Mumbai), production mode |
| Auth | Email/Password |
| Admin account | `admin@brandmintstudios.in` |

`vercel.json` sets `cleanUrls: true`, so `login.html` serves at `/login`. All
internal links use the clean path with no `.html`.

**Production is promoted by hand** in the Vercel dashboard. A push creates a
preview; it does not go live on its own. Test the preview, then promote.

**Vercel does not deploy `firestore.rules`.** There are two production
surfaces and promoting only moves one of them:

| Surface | Holds | Deployed by |
|---|---|---|
| Vercel | the HTML, CSS, ES modules, `/api` | promote in the dashboard |
| Firebase | **the security boundary** | Firestore → Rules → Publish |

A rules change that is committed, pushed and promoted is still **not in
force**. This is easy to get wrong in the dangerous direction: the commit is
green, the deployment is green, and the database is still open. When a change
touches `firestore.rules`, publish the rules *first* — new rules are almost
always stricter, so the older code already live keeps working, whereas new
code against old rules can be denied.

Publish by pasting the file into the Console rules editor. It needs no
credential, which is the point — see §3 on why a service account key is not an
acceptable shortcut here. Afterwards, confirm what is actually live rather
than trusting the dialog: Console → Firestore → Rules shows the published
source, and it should match the file on the branch character for character.

**Firebase authorized domains** must include any host you sign in from, or
auth fails with `auth/unauthorized-domain`. Currently: `localhost`, the two
`*.firebaseapp.com`/`*.web.app` defaults, `brandmintstudios.in`,
`www.brandmintstudios.in`, and the Vercel branch alias.

---

## 3. Architecture — read before writing a line

**There is almost no server.** Static HTML, CSS and ES modules on Vercel.
Firebase is reached from the browser with the Web SDK.

The exception, added when invoice payments landed, is `/api` — three Vercel
serverless functions handling Razorpay. They hold the Razorpay key in a Vercel
environment variable and **read Firestore using the caller's own ID token**, so
they act with exactly that user's authority and never above it. There is still
no privileged server identity anywhere in this deployment. See `docs/PAYMENTS.md`.

The static site itself is unchanged: no build step for it, and the pages still
serve as files.

Which means: **`firestore.rules` is the security boundary. Nothing else is.**
Every check in the UI is a convenience. If the rules allow it, a client can do
it with a console open.

- No framework, no build step, no `package.json`, **no npm dependency**.
- Firebase v10.14.1 as ES modules from
  `https://www.gstatic.com/firebasejs/10.14.1/`. Google's own CDN — not
  esm.sh, so auth does not depend on a third party's uptime.
- No Supabase. No `firebase-admin`. The old Supabase marketing-auth path
  (`auth/marketing.js`) is deleted. `admin/supabase.js` still exists because
  the separate legacy `admin/` CRM imports it — **leave that alone**.

The Firebase web config is **public by design** and ships in every Firebase
web app. It is not a credential. The **service account private key is the
opposite** — root credential, never expires, bypasses every rule. It must
never be committed, pasted, logged, or put in an env var. Nothing here needs
it, and the payment functions were deliberately designed so that stays true.

This has been tested once in anger and the rule held only partly. On
2026-07-28 the `firebase-adminsdk-fbsvc@` key `090ec957…` was handed over to
publish a rules change. It worked — but it was the wrong tool for a job the
Console does in a minute with no credential at all, and the moment a key is
pasted anywhere it is spent: it lives in the transcript regardless of what is
deleted afterwards. That key was destroyed locally and must be treated as
public. **A key that has been pasted is a key that must be rotated**, and the
correct answer to "deploy the rules" is never a key.

It never reached git — the working tree and all 98 commits were scanned, and
`.gitignore` lines 24-29 exist to catch the filename patterns. That is the
part that held.

> §9 below lists "Admin SDK server-side" as a legitimate option, which would
> require exactly the env var this paragraph forbids. **These two contradict
> each other.** The payments work sidestepped it rather than settling it, by
> having `/api` read Firestore with the caller's ID token instead of a service
> account. If a future feature genuinely needs to write without a signed-in
> user, that is the moment to decide which of these two paragraphs wins —
> and to write the audit log (§9 item 4) first.

### Usernames on a system that has none

Firebase Auth only knows emails. Clients get a username because that is what
Sumanth hands out. The mapping is arithmetic, not a lookup table:
`greenbasket` → `greenbasket@brandmintstudios.in`. Lowercased and trimmed; an
input containing `@` is used as-is. There is no public `usernames` collection
to enumerate.

---

## 4. Non-negotiables

Violating any of these is a bug of the highest severity regardless of what a
task says.

**Never collect a client credential.** No field anywhere in which a client
types a password, API key, secret or token. Access requests always read *"add
hello@brandmintstudios.in as a user on your own account"*. If a credential
lands in this database, one breach becomes the client's breach.

**Passwords are Firebase's problem.** We never store, hash or compare one. The
Client Access panel takes a **UID**, never a password — the password is set in
the Firebase Console and exists nowhere else.

**Login failure never reveals whether a username exists.** One message for
both cases: "Wrong username or password."

**Tenant isolation is enforced by rules, never by the UI.** Never trust an id
from a URL or a form.

**No proposal is ever counted as revenue.** `retainerStatus` is
`signed | proposed | none` and only `signed` is money. Never sum proposals into
MRR. Never give a projection the same visual weight as a fact.

**Empty is not the same as done.** An empty collection must never render as a
completed, green, on-track state. If a number is derived from an empty
collection, say the collection is empty rather than printing a reassuring zero.
This has cost two review rounds already. The same rule applies to *colour*: on
`/tenancy-check`, a denied read is the pass condition for a foreign tenant, so
it renders green — colour by whether the result is correct, not by whether it
succeeded.

**Do not seed plausible-looking fake data.** Realistic placeholder numbers are
how a dashboard starts lying to its owner. Use only facts Sumanth has actually
stated, or leave it empty and let him fill it in. The legacy `admin/` CRM seed
is a museum of what not to do (invented clients, a fake GSTIN, a fake bank
account) — **never import it into Firestore.**

**Minimum contrast 4.5:1 on anything interactive. Compute it, do not eyeball
it.** Two invisible buttons have already shipped; the portal's primary Sign in
CTA was cream-on-cream at 1.03:1. Note that `--ink`/`--cream` *flip meaning*
between colour schemes — the solid brand button therefore uses its own fixed
`--bm-btn-bg` / `--bm-btn-fg` pair, which is why it is safe in both.

`tests/contrast.test.mjs` now enforces this instead of trusting it. It reads
the tokens out of `bm-app.css`, composites the translucent ones over the
surface behind them, and checks every interactive pair in **both** themes —
compositing is what caught the muted pill sitting at 4.00:1 while the token
alone read 5.10:1. Adding a `.bm-pill--x` with no measured pair fails the
suite.

---

## 5. Files

```
login.html          -> /login           username + password
portal.html         -> /portal          the client's view
onboarding.html     -> /onboarding      the intake checklist
studio.html         -> /studio          admin dashboard, client access, CRUD
tenancy-check.html  -> /tenancy-check   proves isolation from a client session
assets/bm-app.js                        Firebase init and every read and write
assets/bm-app.css                       shared styles, all classes prefixed bm-
assets/bm-runbooks.js                   playbook drawer + lazy loader
assets/runbooks/*.js                    the playbooks themselves, as data
api/payments/*.js                       Razorpay, serverless. No service account.
firestore.rules                         the security boundary
```

Flat filenames are deliberate: `cleanUrls` would make `admin/index.html`
collide with the existing legacy `admin.html`.

**Do not touch** — live marketing site and legacy CRM:
`index.html`, `styles.css`, `script.js`, `favicon.svg`, `og-image.*`,
`admin.html`, `admin/`, `brand-kit/`, `brand-mint-admin/`.

`brandmint-os/` was a vendored Next.js app that was never built and served
404s. Deleted. **Do not bring it back** — it assumed a server this site does
not have.

---

## 6. Data model

```
organisations/{orgId}   { name, kind: studio|client|internal, status: active|archived,
                          retainer, retainerStatus: signed|proposed|none, note }
users/{uid}             { orgId, role: admin|client, name, username }   uid = Auth uid
projects/{projectId}    { orgId, name, type, dueAt, progress, billable }
  ../milestones/{id}    { title, owner: us|client, status, dueAt }
  ../intake/{id}        { label, group: assets|content|access|decisions, raisedAt, done, clearedAt }
  ../deliverables/{id}  { title, version, url, status: in_review|approved|changes_requested,
                          decidedAt, decidedBy }
  ../scope/{featureId}  { featureId, label, amount, days, order, agreedAt, changedAt,
                          status: agreed|building|delivered|accepted }
invoices/{invoiceId}    { orgId, label, amount, status: paid|due, dueAt }
leads/{leadId}          { name, source, stage, createdAt, firstResponseAt, lossReason }
```

`project.type` uses the service-catalog vocabulary in `SERVICE_TYPES`
(`site | tool | brand | media | seo | ai | internal`) so milestone templates
can key off it. `null` means not set, and renders as such.

`project.progress` is `null` when unrecorded — **never coerce it to 0**, or the
portal draws an empty bar that reads as "started, nothing done".

### `scope` is the quotation, kept alive

Written by `/quote` → *Save as agreed scope*, and it is the only thing on a
project that records **what was sold**. The document id is the `featureId`, so
re-saving a grown quote adds the new lines and touches nothing else — the same
idempotence intake needed, for the same reason: a line already marked
`delivered` must never be reset to `agreed` by a routine re-save.

`scopeProgress()` derives the percentage from the lines, **weighted by
`days`**, so a nine-day line and a one-day line are not each half the job. It
returns `null` — never `0` — when there is no scope: zero draws an empty bar
that reads as started-and-stalled, and an unscoped project has not stalled.

`scopeValue()` counts a line as earned only at `accepted`. `delivered` is
handed over, not confirmed. Counting effort as money is the same mistake as
counting a proposal as revenue, one step further along.

The client may **read** the scope and **not write** it. Delivery status is the
studio's assertion about its own work; a client who could mark a line accepted
could equally reopen a finished one.

Nothing automatically decides a line is done. That judgement is the studio's,
and a job that guessed would produce a progress bar that is confidently wrong —
which is the failure this replaces, not a variant of it.

### The three fields that carry the most weight

- **`milestone.owner`** (`us | client`) turns "the project is late" into "the
  project is late because we have been waiting nine days for their photos".
- **`intake.raisedAt`** — the *age* of a blocker is what makes it move. Days,
  oldest first.
- **`lead.firstResponseAt`** — market median is ~42 hours; under five minutes
  makes qualification roughly 21× more likely. The single most valuable number
  in the business. Stamped once by "Log first response" and **never moved** —
  if it can be edited it stops meaning anything. Never remove it.

### `users/{uid}` is load-bearing

The rules' `me()` and `myOrg()` both do `get(/users/$(uid))`. A signed-in
client with no `users` document cannot read **anything** — not their own org,
not their own project. Create it in the Client Access panel on `/studio`.

---

## 7. Security rules

Admin is identified by the **email claim on the token**, not by a `users`
document. That is deliberate: an earlier version checked
`users/{uid}.role == 'admin'`, which deadlocked — you could not write the
first admin document without already being admin.

A client can do exactly two writes: tick an intake item, and approve or
request changes on a deliverable. Nothing else. `onlyTouches` is what stops a
tick from smuggling in a field change.

`onlyTouches` alone is not enough, and the gap is easy to miss: it constrains
**which** fields may change, not **what** may be written into them. Until the
security pass a client could approve a deliverable while recording the admin's
uid as the approver, dated six years earlier, and could set `clearedAt` to an
arbitrary string. Proven against the emulator, not inferred. So the values are
pinned too — `decidedBy == request.auth.uid`, and both timestamps
`== request.time`, which only `serverTimestamp()` satisfies.

That is not a leak, and it is worse than one for what this product is: the
portal's entire claim is that it says who is holding something up and since
when. A record the interested party can forge answers nothing.

Everything the admin UI does is already covered by `isAdmin()`. Adding admin
features has so far required **no rules changes** — if a change seems to need
one, stop and think about whether it is really admin-only.

---

## 8. The two views

### `/portal` — five things, resist the sixth

1. Where we are — status, next milestone, date, progress, and the agreed
   scope with how much of it is delivered (**folded into this panel, not a
   sixth one**)
2. **What we need from you** — open blockers, dated, oldest first. The reason
   this product exists.
3. Waiting on your approval — one click
4. Preview links
5. Invoices, unpaid rows highlighted

Every additional panel is somewhere a client gets confused and sends a
message, which is the exact cost this portal exists to remove.

### `/studio` — admin only

Signed MRR against break-even · leads with first-response capture · plan vs
actual · Client Access · delivery health · per-project CRUD including the
agreed scope · three org tables · seed button.

The scope's status pills on *Delivery → Manage projects* are **buttons**: one
click moves a line one step along `agreed → building → delivered → accepted`.
That is the whole daily loop — mark the line, and the percentage, the client's
portal and delivery health all follow without anything being typed twice.

**Break-even is ₹1,00,000/month**, exported once as `BREAK_EVEN_MONTHLY` from
`bm-app.js`. Do not scatter copies.

> The ₹6.5 L/month break-even in `brand-mint-admin/06-FINANCIAL-MODEL.md` is a
> **Y1 plan for a three-person studio that has not been hired**. It is a
> target, not this month's bar. Using it as the gauge would make every real
> month look like a catastrophic miss. Keep them separate.

### Business docs → structure, not data

`brand-mint-admin/*.md` contributes **shapes only**: `SERVICE_TYPES` and
`MILESTONE_TEMPLATES` from the service catalog, `LEAD_STAGES`,
`FUNNEL_TARGETS`, `LEAD_SOURCES` and `LOSS_REASONS` from the sales playbook.
Its *numbers* are aspirations and never seed anything. Milestone templates
supply the shape and the ownership split; **the admin supplies the start
date**, so no schedule is ever invented.

---

## 9. Open, in priority order

1. **Run the tenancy test.** `/tenancy-check` exists and is one click, but it
   only proves anything **from a client session** — as admin it correctly
   reports "inconclusive". Create a client login, sign in as them, load the
   page, confirm "Isolated". Until this is done isolation is designed but
   unproven.
2. ~~**Invoices are admin-entered only.**~~ **Done.** Clients pay from
   `/portal`; the admin reconciles from `/studio` with one click. No webhook
   and no service account — see `docs/PAYMENTS.md`.
3. **Notifications** — blocker raised, deliverable ready, invoice due. Nothing
   exists.
4. **Audit log** — an append-only `activity` collection. Build this *before*
   any agent gets write access to anything.
5. **Multi-tenancy debt** — de-hardcode the admin email and `brandmint` orgId
   (see §1) before this is sold to a second studio.

### A note on 2, 3 and 4

They need a server, and this site does not have one. **Do not solve that by
putting a secret in the browser.** Two legitimate options: Vercel serverless
functions in `/api` (holding e.g. `RAZORPAY_WEBHOOK_SECRET` as a Vercel env
var, Admin SDK server-side, static front end undisturbed), or Firebase Cloud
Functions (needs the Blaze plan). Whichever: verify the webhook signature,
never log the raw body, never log or print a secret.

---

## 10. Deliberately out of scope

Useful at five people, a distraction at one. Do not build without being asked:

ticketing · time tracking · capacity planning · per-project profitability ·
in-app chat · a settings page · file uploads · a billing engine (Razorpay does
this) · e-signature (Zoho Sign does this) · analytics (Vercel Web Analytics
does this)

---

## 11. How to work here

- Small commits, one concern each. `feat:` `fix:` `chore:` `refactor:`.
- Push to `claude/new-session-glceza`. Test the preview, then promote by hand.
- **Do not add a dependency** without saying why and getting a yes. Runtime
  dependencies: none.
- If a change touches auth, tenancy or money, **say so explicitly** in your
  summary so it gets reviewed properly.
- Report what you did **not** do and what you could not verify. "I did not
  have a live browser to click through sign-in end to end" is a useful
  sentence. Silence is not.

### Checks worth running before you push

```bash
# every inline module parses
node --check <(sed -n '/<script type="module">/,/<\/script>/p' portal.html | sed '1d;$d')

# every imported symbol actually exists in bm-app.js
# (a missing export is a hard runtime error, not a warning)
```

## 12. Definition of done

- A client cannot see another client's data by editing a URL — **proven, not
  designed**.
- No credential field exists anywhere.
- No proposal is counted as revenue.
- No empty collection renders as a completed or on-track state.
- Everything interactive clears 4.5:1 contrast, measured.
- The client portal still shows five things.
- The marketing site at `/` is unaffected.

## gstack (recommended)

This project uses [gstack](https://github.com/garrytan/gstack) for AI-assisted workflows.
Install it for the best experience:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

Skills like /qa, /ship, /review, /investigate, and /browse become available after install.
Use /browse for all web browsing. Use ~/.claude/skills/gstack/... for gstack file paths.

It is **tooling, not a dependency**: nothing in `/` or `/api` imports it, it adds no
`package.json` to this repo, and the site builds and deploys exactly as before if it
is absent. Optional mode deliberately — the `required` mode installs a PreToolUse hook
that blocks work when gstack is missing, which on a fresh container means a broken
session rather than a slower one.

`./setup` ends by downloading Playwright's Chromium. If that download is blocked (a
sandbox, a proxy, a corporate network) the rest of the install is still fine — point
gstack at a Chromium you already have:

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers   # wherever yours lives
export GSTACK_CHROMIUM_PATH="$PLAYWRIGHT_BROWSERS_PATH/chromium/chrome-linux/chrome"
```

`/browse` drives headless-shell, so that build has to be present too; if only a
headed Chromium is installed, expect `Executable doesn't exist at .../chrome-headless-shell`.
