# Brand Mint — working agreement

This repo is **two things in one**: the live marketing site at `/`, and the
client portal that grew inside it. Read this before changing anything.

Where this file and a task description disagree, **this file wins — say so
rather than silently doing the other thing.**

---

## 0. The requirements spec, and what it changed

A formal *Admin Dashboard — Requirements Specification* (v0.1, executive
sign-off draft) now exists outside this repo. It is a good document — Appendix
A defines every metric once and bindingly, and SEC-01/02/10 correctly name
insecure direct object reference as the real risk rather than chasing exotic
attacks. **Read it as the product direction. Read this file as what is true
today.** Where they disagree, this file still wins, and the list below is
exactly where they disagree and why.

Its Section 2 asks each assumption to be confirmed or overturned before
sign-off. Three were put to Sumanth directly and answered:

| | Answer |
|---|---|
| **A2 — React + TypeScript + Supabase/Postgres** | **OVERTURNED. Firebase stays.** |
| **Company status** | **Not incorporated. No GSTIN.** People *are* working alongside him. |
| **§10's out-of-scope list** | **Stays.** |

### A2 is overturned, and this is the reasoning

The spec assumes Postgres row-level security. This app's boundary is
`firestore.rules`, proven against the emulator by 46 tests, with a portal 119
onboarding checks drive from the client's own side. Firestore rules can express
every role in the spec's Section 3 matrix. **RLS is a means, not a
requirement** — SEC-01's actual demand is "enforced at the database layer, not
in application code", and that is already true here.

Moving would discard a working deployed product and every test proving it, to
arrive at the same guarantee. The one honest argument for Postgres is that the
Section 4 executive reporting is easier in SQL. That is not worth a rewrite
today; revisit it if reporting becomes the bottleneck.

### There are collaborators now

This is the real change, and it is the one that touches security.

**The studio is no longer one person.** People are working alongside Sumanth.
The spec's five roles — CEO, Partner, Collaborator, Finance, Client Guest —
are therefore live design work, not a future concern, and its Section 3
permission matrix is the authority for what each may see.

Two rules from that matrix are non-negotiable and both are already this repo's
position: enforcement is at the database layer, and **collaborator rates are
visible only to the CEO and Finance** — a collaborator sees their own rate and
nobody else's.

> **This is the first change in a long time that genuinely needs
> `firestore.rules` edits.** Every admin feature since the CRM rebuild needed
> none. Publish rules FIRST, by hand, from the Console (§2) — new rules are
> stricter, so old code keeps working against them, whereas new code against
> old rules is denied.

### §10 stays, so some of the spec is deferred

Sumanth kept the out-of-scope list. That is coherent alongside the roles: he
needs collaborators to have scoped access, and does not want a timesheet, a
capacity planner or a ticket system built to feed metrics nobody has asked for.

**These spec requirements are therefore DEFERRED, not built, not silently
approximated:**

| Deferred | Depends on |
|---|---|
| EX-05 capacity view | capacity planning (§10) |
| EX-06 live project margin | time tracking (§10) |
| EX-08 warranty exposure | a defect register (§10 ticketing) |
| OP-09 effort logging · OP-11 defects · OP-13 file attachments | §10 |

A margin figure computed without effort data would be a number that flatters
or frightens at random, which §4 forbids more strongly than it forbids an
absent feature. **Show these as "not tracked", never as a zero or an estimate.**

### Two facts that must not reach a document

**There is no Pvt Ltd and no GSTIN.** The spec is headed *Brand Mint Studio
Pvt. Ltd.* and assumes a GSTIN throughout; neither is true yet.

- No invoice, quote or page may print a GSTIN, a PAN, or a Pvt Ltd billing
  entity until Sumanth confirms each is real. §4 already forbids this — a
  plausible-looking tax number on a financial document is a false statement to
  a client, not a placeholder.
- **The marketing site still promises "GST invoicing included" and "GST extra
  at 18%"** (`index.html:270,274`, `home-v2.html:98,361`) and nothing in the
  stack can produce a GST invoice. That copy is currently false and is the
  oldest open item here.

### Still open, deliberately not decided

The spec's **A1** says this is an internal tool, not a resellable SaaS, and its
§10.2 excludes multi-tenancy. §1 below says the opposite — multi-tenant by
design, intended to be sold. **That was not put to Sumanth and has not been
settled.** Until it is, keep building multi-tenant: it costs nothing extra
today and un-picking it later is cheap, whereas retro-fitting it is not.

---

## 1. What the portal is for

Brand Mint Studios was a solo studio and is now Sumanth plus collaborators
(§0). He remains sales, delivery, QA and support; the difference is that other
people now touch the work and therefore need scoped access. Two consequences
still govern every decision:

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

- No framework, no build step, no `package.json`.
- **One vendored runtime dependency, on `/home-v2` and `/studio`:**
  `assets/vendor/anime.esm.min.js` (anime.js v4.5.0, MIT, zero deps of its
  own). §11 says not to add one without saying why and getting a yes; the yes
  was explicit — smoother motion on the home screen. ~40 KB gzipped, vendored
  rather than fetched from a CDN for the same reason Firebase comes from
  Google's own servers, and **deferred** on both pages: each renders and is
  readable before it arrives. No third page loads it. See
  `assets/vendor/README.md`.

  It is imported by exactly two files, `assets/home-v2-motion.js` and
  `assets/bm-crm-motion.js`, and **both are optional by construction**. Neither
  page hides anything in CSS; each motion module sets its own starting state at
  runtime immediately before animating. `tests/motion.mjs` blocks the script
  and anime.js and asserts `/home-v2` stays readable; `tests/admin-ui.mjs`
  blocks both and asserts `/studio` stays readable **and still clickable**.
  Adding a third consumer means adding that test too.
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

**Never hide content in CSS and rely on JavaScript to reveal it.** The usual
scroll-reveal pattern — `opacity: 0` in the stylesheet, JS to put it back — is
a blank page the day the script 404s or an extension blocks it.
`assets/home-v2-motion.js` hides elements itself, at runtime, immediately
before animating them, so a script that never loads leaves the page whole.
`tests/motion.mjs` blocks both the motion script and anime.js and asserts the
page is still fully readable in each case.

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
docs/WALKTHROUGH.md                     how to actually run /studio, in order.
                                        Update it in the SAME commit that
                                        changes the admin UI, or it becomes a
                                        confident lie about the screen.
tools/make-manual.mjs                   renders that file to a printable PDF.
                                        Re-run it after editing the walkthrough
                                        so docs/brand-mint-studio-manual.pdf
                                        does not fall behind its own source.

login.html          -> /login           username + password
portal.html         -> /portal          the client's view
onboarding.html     -> /onboarding      the intake checklist
studio.html         -> /studio          admin dashboard, client access, CRUD
tenancy-check.html  -> /tenancy-check   proves isolation from a client session
assets/bm-app.js                        Firebase init and every read and write
assets/bm-app.css                       shared styles, all classes prefixed bm-
assets/bm-crm.css                       /studio ONLY — the CRM shell. No colour tokens of its own.
assets/bm-crm-motion.js                 /studio ONLY — optional motion. Hides nothing in CSS.
assets/bm-invoice.js                    the sendable invoice. Prints via the browser.
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
users/{uid}             { orgId, role: admin|partner|collaborator|finance|client,
                          name, username }                              uid = Auth uid
rates/{uid}             { rate, currency }   SEPARATE COLLECTION ON PURPOSE — §7.
                          Firestore cannot withhold a field, so a rate on a
                          document colleagues may read is a rate they can read.
projects/{id}.team      [uid]  who may reach it as partner or collaborator.
                          Absent = CEO-only. Silence is never universal access.
projects/{projectId}    { orgId, name, type, dueAt, progress, billable, mode: build|retainer }
  ../milestones/{id}    { title, owner: us|client, status, dueAt }
  ../intake/{id}        { label, group: assets|content|access|decisions, raisedAt, done, clearedAt }
  ../deliverables/{id}  { title, version, url, status: in_review|approved|changes_requested,
                          decidedAt, decidedBy }
  ../scope/{featureId}  { featureId, label, amount, days, order, agreedAt, changedAt,
                          status: agreed|building|delivered|accepted }
invoices/{invoiceId}    { orgId, label, amount, status: paid|due, dueAt, paidAmount }
leads/{leadId}          { name, source, stage, createdAt, firstResponseAt, lossReason }
activity/{id}           { at, actor, actorEmail, action, summary, orgId, target, amount }
```

`activity` is the audit log (§9 item 4) and it is **append-only for everyone,
including the admin** — the rules deny `update` and `delete` outright. That is
the only property that makes it worth reading: the admin is the sole actor who
can change business data, so the admin is exactly the actor it exists to
record. `at`, `actor` and `actorEmail` are pinned by the rules to the server
clock and the caller's own token, so an entry cannot be backdated or blamed on
someone else.

Write it with `logActivity()`, which **never throws**. Logging is a side effect
of an action that has already succeeded; if it threw, the caller would report a
failure that did not happen and would probably retry the action. `getActivity()`
does throw, on purpose — the Activity view has to tell a denied read apart from
an empty collection, or an unpublished ruleset looks exactly like a quiet week.

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

### Three deal shapes, and what a month is actually worth

The studio sells three ways and they behave nothing alike — `DEAL_TYPES` in
`bm-app.js`:

| | build | retainer |
|---|---|---|
| `oneoff` | yes, 50/50 | **no, by agreement** |
| `then` | yes, 50/50 | starts at launch |
| `retainer` | no | the whole engagement |

`project.mode` (`build | retainer`) records which. It is written by
`createEngagement()` and is **absent on every project made before it existed**,
so `projectMode()` falls back rather than forcing a migration: scope means a
build; no scope plus a paying retainer client means a retainer. Without it a
retainer engagement looks exactly like a build nobody has set up, and Today
nags about its missing milestones forever — which is how an action list stops
being read.

**`monthlyIncome()` counts retainers AND live builds, and keeps them apart.**
Counting only retainers reported ₹37,500 against a ₹1,00,000 break-even while
two builds worth ₹10,00,000 were in flight. A number that frightens is exactly
as false as one that flatters.

**The builds are blended, not added.** The first fix summed each build's own
run rate and reported ₹6,43,846/month — one person delivering sixty-eight
working days of work inside a calendar month. Every live build is pooled
instead: total agreed value over total agreed days, times
`WORKING_DAYS_PER_MONTH`. Taking on a third build therefore lengthens the
schedule rather than raising the month, which is the property that makes the
number worth trusting. `tests/income.test.mjs` asserts it.

The two halves are returned separately and **must be displayed separately** —
retainer income arrives again next month, build income stops the day it
launches, and one merged figure cannot answer "should I be selling". A
proposal is still counted as nothing.

### Starting an engagement is one screen

`createEngagement()` takes a name, a deal type, a price and a number of weeks,
and creates the organisation, the project, the single agreed scope line, the
50/50 invoices and the milestone schedule in one submit.

It replaced seven steps across three screens — add client, add project, go to
`/quote`, build the scope, save it back, return, stamp a schedule — every one
of which was somewhere to stop halfway, and people did. The report was *"too
complex to onboard and add the price and time"*.

The scope becomes **one** line, not an invented four-phase breakdown: a
breakdown nobody agreed to would be fiction with a progress bar attached.
Refine it on `/quote` when a real one exists. The retainer is created
`proposed` unless the box is ticked — no path through that form can quietly
raise MRR.

### The invoice a client actually receives

`assets/bm-invoice.js` builds the document and calls `print()`. Every browser
turns that into a PDF, so this needs no library, no service and no build step —
a PDF generator would have been ~200 KB of dependency producing a worse
document than the browser's own print engine.

**The payee details are NOT in this repository, and must never be put in it.**
Account number, IFSC and the account holder's legal name live in Firestore on
the studio's own organisation document (`kind: "studio"`), edited from a small
panel on Money. This repo is public (§2): hardcoding a bank account here would
publish it permanently, in the git history, to anyone who looks — which is a
different thing from printing it on an invoice sent to one client. The rules
already restrict organisation writes to the admin, so this needed no rules
change and should not get one. Changing banks is a form, not a deploy.

`studioPayee()` returns **null unless holder, account and IFSC are all present**,
and the invoice omits the whole block when it is null rather than printing a
labelled empty line. An invoice is a financial document: a plausible-looking
tax number or account number on one is not a placeholder, it is a false
statement to a client, and the legacy seed already did exactly that (§4).

The same rule applies to **screenshots**. `docs/` is committed, so anything
rendered into it must use placeholder payee details — `tests/` and the
screenshot scripts pass `payee: null` or obvious dummies for exactly this
reason. A real account number in a committed PNG defeats the whole arrangement.

GST is deliberately unimplemented. It needs a real GSTIN and a real serial
sequence; the `BM-XXXXXX` reference is derived from the document id and is
**not** a GST serial.

The reference (`BM-XXXXXX`) is derived from the invoice's own id, so it never
needs a counter and never changes. It is **not** a GST serial — if GST invoicing
is needed, that needs a real sequence and a real GSTIN, and neither should be
invented here.

### Part payments, and the fallback that makes them safe

`paidAmount` is how much has actually ARRIVED against an invoice. `status`
stays `paid | due` and is kept in step, because the client portal, `/api` and
every invoice written before this all depend on it.

**Read it with `invoiceReceived()`, never directly.** An invoice with no
`paidAmount` is read from its status — paid means the full amount arrived,
which is exactly what it meant before. Reading the missing field as `0` would
have wiped every rupee already collected off the Money view the moment this
shipped. `invoiceState()` returns `due | part | paid`; two states could not
describe a half-paid invoice without lying in one direction or the other.

`recordPayment()` takes the **total received**, not "add this payment". A
running total is one number that can be checked against a bank statement, and
submitting the same figure twice cannot double it. `status` is derived inside
that function so it can never disagree with the amount.

**Online payment stays all-or-nothing.** `api/payments/create-order.js` charges
`invoice.amount` and `verify.js` requires the payment to match it exactly, so a
part-paid invoice must not offer *Pay now* — it would charge the whole thing
again. The portal shows the balance and says it is settled by transfer.
Changing that means changing the amount check in `verify.js`, which is the
control that stops underpayment, so do not do it casually.

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

### Five roles, and the one the matrix cannot express

`firestore.rules` now implements the spec's Section 3 matrix:
`admin (CEO) · partner · collaborator · finance · client`.

The CEO is still the **email claim on the token**. Every other role is read
from `users/{uid}.role`, which only the CEO can write — so the bootstrap
problem exists once, at the top, and is solved once.

**Partner and Collaborator access is scoped by assignment.** A project carries
`team`, a list of uids. A project with no `team` — every project written before
this ruleset — denies staff and stays CEO-only. Silence means no access, never
universal access.

> **Collaborator rates are in their own collection, `rates/{uid}`, and this is
> not a stylistic choice.** Firestore grants reads **per document, not per
> field**: there is no way to return `users/{uid}` while withholding one key.
> Putting `rate` on the user document and hiding it in the UI would satisfy the
> screen and violate SEC-01 exactly as written. Do not move it back.

Read is CEO, Finance, or the collaborator themselves. **A partner cannot read
any rate, including their own** — the matrix says `Partner —` and §3 says no
screen may grant access the matrix does not. Whether that is intended or an
artefact of the row being named "collaborator rates" is **unsettled**; it is
implemented strictly because widening is a one-line change and a review,
whereas discovering it was wide is an incident.

**`activity` create widened from CEO-only to any staff role.** With five roles,
a partner moving a scope line or Finance settling an invoice are exactly the
events worth recording; leaving create at CEO-only would have made the log
silently incomplete the moment a second person started work — worse than no log,
because it reads as a full record. Read stays CEO-only. Update and delete stay
`if false` for everyone.

**Known deviation from the matrix:** Client Guest is specified as seeing
released deliverables only. The released/internal flag is OP-13, which §10
defers, so a client still reads every deliverable on their own project. When
OP-13 lands, that read gains `&& resource.data.released == true`. Recorded here
rather than quietly approximated.

`tests/rules.test.mjs` proves all of it against the emulator — **64 checks**,
the original 46 plus 18 matrix cells, and the new ones are mostly denials. A
role that can see too little is an inconvenience; a role that can see too much
is the breach SEC-02 names as the realistic failure mode.

### Why the CEO is a token claim

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

The one exception is `activity` (§6), and it is an exception in the other
direction: it needed rules not to *permit* something but to **forbid** it. The
admin can already write anything; what the log required was `update` and
`delete` denied to everybody, so the record cannot be revised by the person it
records. `tests/rules.test.mjs` proves that against the emulator rather than
inferring it — including that an entry cannot be backdated or attributed to
another account.

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

### `/studio` — admin only, and it is a CRM

**Four sections** down the left, one on screen at a time: Today · Clients ·
Leads · Money. The section lives in the URL hash, so a reload keeps you where
you were.

It was seven. The report was that it was *still* too much — "why so many
sections to create and track and archive". Delivery and Access were not
separate concerns, they were the same client seen from two more angles:

- **Delivery folded into Clients.** A project belongs to a client, so it opens
  from that client. The client row still carries the signal — days blocked,
  money owed — because a list you must open to read is a menu, not a list.
- **Access folded into the client it grants access to.** Granting a login used
  to mean going to another section and picking the organisation back out of a
  dropdown you had just come from.
- **Activity moved to Tools.** It is an audit log, not a daily screen.

A client record now holds everything about that client: retainer, projects,
invoices, portal login, and **Delete**. Archive and Delete both exist because
they answer different questions — "this engagement ended" versus "this should
never have been here". Delete cascades through projects, their subcollections
and invoices; it **cannot** remove the Firebase Auth account, and says so.

It replaced a single page that rendered fifteen panels and every project,
expanded, simultaneously. The report was *"very complex, I'm unable to
understand anything"* and it was accurate — the page showed everything it knew,
all the time. The shape now is the ordinary CRM one and nothing cleverer: **a
list of records, and a detail drawer for the one you picked.**

| Section | What it is |
|---|---|
| Today | break-even gauge, four tiles, and the action list — every line a fact with the thing that fixes it attached. The headline is **this month** (retainers + live builds, split), not signed MRR alone. Two of its lines exist because `tests/onboarding.mjs` found them missing: projects with **nothing raised with the client** (the portal's whole job, switched off) and retainers **proposed but not signed** |
| Pipeline | leads as a kanban by stage, moved with two buttons; funnel/source/loss against the playbook below |
| Clients | one row per organisation → drawer: retainer, onboarding, projects, invoices, login. **New engagement** creates all of it in one screen |
| Delivery | one row per project → drawer: agreed scope, milestones, intake, deliverables |
| Money | **the invoice ledger** plus retainers. *Record payment* takes the total received; *Invoice* opens a sendable document |
| Access | client logins, and the existing ones listed |

`/` or `⌘K` opens a command palette over every client, project, lead and
invoice. **New** creates whatever the current section creates.

**It added no Firestore collections and no fields, so it needed no rules
change.** That is the safe order, not a shortcut: rules are published by hand
from the Console (§2), so a UI needing new rules would go live denied.

Two things it added that did not exist before and should not be removed:

- **The invoice ledger.** `getAllInvoices()` was loaded on every render and
  never displayed. There was no screen anywhere that listed what was owed.
- **Marking a retainer signed.** The onboarding checklist had "Retainer
  signed" as step 2 with no control anywhere that could do it, so the step was
  unreachable from the UI.

The scope status pills in the **project drawer** are **buttons**: one click
moves a line one step along `agreed → building → delivered → accepted`. That is
the whole daily loop — mark the line, and the percentage, the client's portal
and delivery health all follow without anything being typed twice.

The delivery *list* still shows the derived percentage without opening
anything. A list that made you open every row to find the stalled project would
be the old wall of panels wearing a nicer coat.

**Break-even is ₹1,00,000/month**, exported once as `BREAK_EVEN_MONTHLY` from
`bm-app.js`. Do not scatter copies.

> The ₹6.5 L/month break-even in `brand-mint-admin/06-FINANCIAL-MODEL.md` is a
> **Y1 plan for a three-person studio that has not been hired**. It is a
> target, not this month's bar. Using it as the gauge would make every real
> month look like a catastrophic miss. Keep them separate.

### Onboarding is tested from BOTH sides at once

`tests/onboarding.mjs` opens six engagements through the real UI — all three
deal shapes — grants each a portal login, then signs in **as that client** and
reads their portal. 119 checks.

It exists because a studio can believe a client is onboarded while the client
sees a blank page: the Auth account and the `users` document are separate
writes, and one without the other is a login that can read nothing at all.
Creating the Auth account is done against the emulator's REST API on purpose,
because in real life that happens in the Firebase Console, outside this
product — the app never sees a password (§4).

It has already found two things no admin-side test could:

- **The save confirmation was destroyed by its own refresh.** `RENDER.access()`
  rebuilds the whole view, replacing `#bm-a-status` a moment after the message
  was written to it. Every database assertion passed; the screen just went
  silent, so you could not tell whether the login had been created.
- **The action list was empty after six perfect onboardings** — no mention of
  the projects with nothing raised, or of ₹60,500/month of agreed retainers
  sitting unsigned.

### Business docs → structure, not data

> **The quarantine is wider than this file used to say.** `06-FINANCIAL-MODEL.md`
> is named below, but **five more files have the same defect or worse**:
> `finance/y1-pnl-model.md` (the same fiction to rupee precision, and it says
> "update monthly with actuals" while containing none — the most misleading
> file in the repo, because precision reads as authority),
> `finance/pricing-calculator.md` (**actively contradicts production**: ₹25,000/day
> against the real ₹10,000, so anything quoting from it prices 2.5× the live
> site — treat as superseded by `assets/bm-catalog.js`),
> `11-HIRING-ROADMAP.md` (six salaries and ESOP percentages for a one-person
> company), `00-EXECUTIVE-SUMMARY.md` ("Currently 18 inbound leads/month",
> present tense, unsupported anywhere), and `12-METRICS-AND-KPIS.md`.
>
> `docs/STUDIO-FACTS.md` is the curated answer: every number in it is traceable
> to a line of source. Agents read that and nothing else.

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
4. ~~**Audit log** — an append-only `activity` collection.~~ **Done.** The
   `activity` collection exists, the rules make it append-only for everyone
   including the admin, and `/studio` has an Activity view. Every action that
   moves money, grants access or changes delivery status writes an entry:
   retainer set, client archived/restored, invoice paid by hand, invoice
   reconciled from Razorpay, invoice deleted, scope line advanced, project
   deleted, portal login granted, database seeded.

   This unblocks the gate in §9a — but read that gate carefully before
   assuming it is lifted. It says the audit log must exist *before an agent is
   given write access to business data*. It exists now; **no agent has been
   given that access, and the tool grant still excludes Bash and every
   `mcp__*`.** Building the log was the prerequisite, not the decision.
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

## 9a. The agent bench

`.claude/agents/` holds 264 vendored personas from
[`msitarzewski/agency-agents`](https://github.com/msitarzewski/agency-agents)
(MIT), pinned to upstream `c89557f`, plus one written here:
**`brand-mint-ceo.md`**.

Vendored into the repo rather than installed with upstream's script, on
purpose. That script copies to `~/.claude/agents/` — machine-wide, invisible to
review, gone when a container is reclaimed, and with no uninstall. In the repo
they are committed, diffable, and removed with `git rm`. **Never run
`./scripts/install.sh` bare from inside this repo** — with no `--tool` flag it
installs for every detected tool and drops `CONVENTIONS.md`, `.windsurfrules`
and `.cursor/rules/` into the working directory.

**Every agent carries an explicit `tools:` line, and that is the whole safety
model.** Upstream ships 253 of 270 with no `tools:` field at all, and in Claude
Code an agent that omits it inherits *everything the main thread has* — Bash,
and every connected MCP server, which here means Vercel, GitHub and Supabase
against a live studio. Inheriting that by omission is not a decision anyone
made. The grant is:

```
Read, Grep, Glob, Edit, Write, WebSearch, WebFetch
```

No Bash. No `mcp__*`. `tests/agents.test.mjs` asserts it — an agent added
without a grant fails the suite instead of quietly acquiring the keys.

This is how §9 item 4 was satisfied before the audit log existed: that rule
gates writes to **the database**, and no agent can reach it. Repo edits land in
git, get reviewed in a commit, and revert.

The audit log now exists (§9 item 4 is done), so the stated prerequisite is
met — but **that is not the same as the gate being open.** No agent has been
given database access, the grant above still excludes Bash and every `mcp__*`,
and `tests/agents.test.mjs` still fails the suite if one is added without a
grant. Building the log removed the blocker; it did not make the decision.

`.claude/agents-quarantined/` holds six files that are vendored but not loaded
— prompts instructing the agent to act without approval, or demanding API keys
(§4: never collect a credential). Its README says why for each.

Re-vendor with `node tools/vendor-agents.mjs --source <clone>` (`--check`
first). It is idempotent and re-applies the grant.

**The CEO reads `docs/STUDIO-FACTS.md`, not `brand-mint-admin/`.**

---

## 10. Deliberately out of scope

Useful at five people, a distraction at one. Do not build without being asked:

ticketing · time tracking · capacity planning · per-project profitability ·
in-app chat · a settings page · file uploads · a billing engine (Razorpay does
this) · e-signature (Zoho Sign does this) · analytics (Vercel Web Analytics
does this)

**This list survived the requirements spec.** It was put to Sumanth explicitly
— the spec marks five of these as *Must*, because EX-06 margin needs effort
logging and EX-05 capacity needs commitments — and he kept the list. So the
spec's dependent metrics are deferred rather than built on invented inputs
(§0). If that changes, lift the exclusion first and build second, not the
other way round.

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
