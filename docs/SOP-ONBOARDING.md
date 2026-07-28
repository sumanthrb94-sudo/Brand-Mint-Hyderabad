# SOP — signed client to running project

The sequence, in order, with what to do when each step is finished. Written
because finishing one step used to leave you looking at nine panels wondering
which was next.

**The dashboard now tells you this too.** `/studio` → **Clients** → *Onboarding
checklist* shows each client's seven steps, ticks the ones that are done, and
names the next one. This document is the longer version.

---

## The seven steps

| # | Step | Where | Done when |
|---|---|---|---|
| 1 | Client created | `/studio` → Clients → Add a client | The organisation exists |
| 2 | Retainer signed | `/studio` → Clients → the org row | `retainerStatus` is `signed` |
| 3 | Project created | `/studio` → Delivery → Add a project | A project exists for that org |
| 4 | Login given | Firebase Console **and** `/studio` → Client Access | `users/{uid}` exists |
| 5 | Agreed scope recorded | `/quote` → Save as agreed scope | The project has scope lines |
| 6 | Requirements raised | `/quote` → push to intake | The project has intake items |
| 7 | Schedule applied | `/studio` → Manage projects → Apply template | The project has milestones |

After seven, it is delivery: move scope lines along as you build, tick blockers
as they clear, put deliverables up for approval, raise invoices.

---

## 1 · Create the client

`/studio` → **Clients** tab → **Add a client**.

Business name, kind (client or internal), monthly retainer — `0` if there is
none.

The retainer is created **proposed**, never signed. That is deliberate: a
proposal counted as revenue is how a dashboard starts flattering the person who
depends on it. MRR does not move.

**Next:** sign it, or create the project and sign later.

---

## 2 · Mark the retainer signed

Only when it actually is — a countersigned agreement or a written yes.

The moment you do, MRR moves and the break-even gap on **Today** changes. That
is the only number on the dashboard that decides whether the month works, so it
must only ever move for real.

**Next:** create the project.

---

## 3 · Create the project

`/studio` → **Delivery** tab → **Add a project**.

Name, type from the service catalogue, optional due date.

Progress starts **unrecorded**, not zero. Zero draws an empty bar that reads as
"started, nothing done" — unrecorded reads as what it is.

> This is where you got stuck before. The answer is step 4: the project exists,
> but the client cannot see it yet, because being able to see it is a separate
> and deliberate act.

**Next:** give them a login.

---

## 4 · Give them a login — two halves, both required

This is the step with the trap. Playbook button on the Client Access panel, or
the short version:

**a. Firebase Console** → `brandmintstudios-a5eb7` → Authentication → Users →
Add user.

- Email is `username@brandmintstudios.in` — `greenbasket` becomes
  `greenbasket@brandmintstudios.in`. Arithmetic, not a lookup table.
- Set a password and put it in your password manager. **That is the only place
  it will ever exist.** Nothing in this codebase stores, hashes or compares one.
- Copy the **User UID** from the new row. Paste it — do not retype it.

**b. `/studio`** → Clients → **Client Access** → username, display name,
organisation, and the UID.

**Do not skip (b).** An Auth user with no `users` document signs in perfectly
and then sees a completely blank portal — no error, nothing. The rules read
`users/{uid}` to find out which org someone belongs to, so without it every
read is denied.

**Verify:** sign in as them in a private window. You should see their
organisation, their project, their invoices. Then load `/tenancy-check` from
that same session — it must say **Isolated**.

**Next:** record what you sold.

---

## 5 · Record the agreed scope

`/quote` → pick the services in scope → price every line → **Save as agreed
scope**.

Until this exists the quote is a document you printed and threw away. Nothing
records what was actually sold, so "how far along are we" is a percentage typed
from memory — and a percentage typed from memory is a percentage that flatters.

Once it exists, four things stop being separate:

- **Progress is derived, not typed.** Each line moves *Agreed → Building →
  Delivered → Accepted*, one click per step on `/studio` → Delivery → Manage
  projects. The bar is computed from where the lines are, weighted by your own
  build-day estimates — a nine-day line and a one-day line are not each half
  the job.
- **The client sees the same list**, on their own portal, inside *Where we
  are*. Not a sixth panel — the portal still shows five things. They can read
  it; they cannot move a line. Delivery status is the studio's assertion about
  its own work, and the rules enforce that.
- **What is still owed is arithmetic.** Value follows *acceptance*, not effort.
  A line half-built has earned nothing, which is the same discipline as never
  counting a proposal as revenue.
- **Re-saving is safe.** Scope grows; saving the same quote again adds only the
  new lines and leaves the existing ones exactly where they are. A line you
  marked delivered stays delivered.

Price every line first — the button refuses an unpriced one, because a wrong
money number is worse than an absent one.

**What this does not do:** nothing inspects your code and decides a line is
finished. That judgement is yours, and a scheduled job guessing at it would
produce a progress bar that is confidently wrong — which is exactly the failure
mode this replaces. What it removes is typing the same fact twice: mark the
line, and the percentage, the client's portal and delivery health all follow.

**Next:** raise what you need from them.

---

## 6 · Raise the requirements

`/quote` → pick the services in scope → **push to intake**.

Each service's requirements become dated blockers on the client's `/portal`
under *What we need from you*, oldest first. This is the reason the portal
exists: the client sees, dated, that they are the holdup, and the chasing
happens without you sending a message.

Safe to run again when scope grows — it adds only what is new and leaves
existing items' dates untouched. A blocker's age is what makes it move, so
re-raising must never reset it.

**Access requests are always delegation.** *"Add hello@brandmintstudios.in as a
user on your own account"* — never a password, never a key. If a client
credential lands in this database, one breach of the studio becomes a breach of
every client.

**Next:** apply a schedule.

---

## 7 · Apply the schedule

`/studio` → **Delivery** → Manage projects → pick the template → **give it a
start date** → Apply template.

The template supplies the shape and who owns each milestone. **You supply the
start date** — no schedule is ever invented.

Once milestones exist, delivery health can tell you whether the project is
late, and the client can see where it is going.

---

## Then: the daily loop

Open `/studio`. It lands on **Today**, which is computed from your own data:

- leads with no first response — the cheapest thing on the page to fix
- projects waiting on the client, oldest first
- duplicate requests making a client's list unreadable
- projects with no schedule
- signed MRR against break-even

Everything else is a tab away: Money, Delivery, Clients, Sales.

**Monday, thirty minutes:** MRR against ₹1,00,000 (cash only). Any lead without
a first response — reply now. Anything waiting on a client more than three days
— the portal already chased them, so follow up only on the red ones.

---

## Quotation and scope

`/quote` builds the client-facing scope document: what is included, the
investment, what you need from them, what is free after launch (30-day bug
warranty, two review rounds), and what costs extra.

**Before every signature, without exception**, check the margin gate. If it
says **BELOW FLOOR — DO NOT SIGN**, do not sign. That gate exists because two
engagements went out at ₹4,524/day and ₹833/day against a ₹10,000 list rate,
and both were arithmetic nobody ran in time.

Two buttons on that page write to the project, and they do different jobs:
**Save as agreed scope** records what *you* owe *them* (step 5), and **Add to
project intake** records what *they* owe *you* (step 6). Both are safe to press
again when scope grows.

E-signature is not built and is deliberately out of scope — Zoho Sign does
this. The portal records the outcome, not the signing.

---

## Rehearse the whole thing without touching production

```bash
bash tests/run-journey.sh
```

Two browsers — admin and client — against local emulators, through all fourteen
stages: lead, first response, signed, project, login, requirements, the client
answering, milestones, deliverable, the client approving, invoice, payment
attempt, reconciliation, isolation proven.

It writes a screenshot of every stage to `docs/journey/`, so you can see what
the client sees at each point rather than taking the pass/fail on trust.

Needs Java. Touches nothing live — the app connects to emulators only when
served from localhost, checked against an explicit list of local hostnames.

---

## What is deliberately not automated

- **Creating the Firebase Auth account.** It needs the Admin SDK, which needs a
  service account key — a root credential that bypasses every rule and never
  expires. This deployment has none and is better for it. Two minutes in the
  Console is the price.
- **E-signature**, **contracts**, **time tracking**, **ticketing**. Useful at
  five people, a distraction at one.
