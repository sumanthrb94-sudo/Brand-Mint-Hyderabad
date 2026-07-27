# Client onboarding — enquiry to handover

The operational sequence. Every stage says what you do, which tool or template
to use, and what must be true before you move on.

The contract templates in `brand-mint-admin/contracts/` and the checklists in
`brand-mint-admin/ops/` already exist and are good. This document does not
replace them — it says **in what order to use them**, and connects them to the
portal and the skeleton, which is the part nobody had written down.

---

## The one rule that pays for this whole document

**No work starts before the 50% advance clears.**

MSA §2.2 and the kickoff checklist both say it. It is the difference between
Green Basket (₹15,000 taken on ₹95,000, 21 days built, ₹80,000 outstanding)
and a project that pays for itself. If you break this rule, break it knowing
you are financing the client.

---

## Stage 0 · Enquiry

**Do:** qualify on the call. `brand-mint-admin/sales/discovery-call-script.md`
and `qualification-rubric.md`.

**Log it immediately:** `/studio` → Leads → Add lead. Then hit **Log first
response** the moment you reply.

> Market median first response is ~42 hours. Under five minutes makes
> qualification roughly 21× more likely. It is the single most valuable number
> in the business and the only one you can improve today for free.

**Before moving on:** they fit the ICP, and you know the metric they want moved.

---

## Stage 1 · Quote

**Do:** build the scope from the feature catalog, not from memory.

```bash
cd commerce-skeleton
npm run quote                    # every preset and feature with prices
npm run quote commerce-cod       # quote a shape
npm run quote -- --features cart-cod,payments,gst-invoicing --scale large
```

The output gives you four things: the price, whether it needs a server, what
you need from the client, and the internal build checklist.

**Dependencies are resolved for you.** Quote `cart-cod` and it silently adds
`catalog-basic` and `dynamic-site` and prices them. Quoting a checkout without
the catalog underneath it is how a fixed price loses money.

**Then generate the client-facing document:** `/studio` → **Scope & quote**.
Tick the same features, print to PDF. That document states what is included,
what is excluded, what is free after launch, and what costs extra.

**Before moving on:** the scope document exists and you have read the
"what costs extra" section aloud to yourself. If a feature has no price set,
the document refuses to produce a total — set the price, do not guess.

---

## Stage 2 · Paper

Three documents, in this order. All templates are in
`brand-mint-admin/contracts/`.

| Document | When | Frequency |
|---|---|---|
| **NDA** | Before they share anything sensitive | Once per client, if asked |
| **MSA** | Before the first SOW | **Once per client, ever** |
| **SOW / Proposal** | Per project | Every project |

The MSA holds the terms; the SOW holds the scope. Never restate MSA terms in a
SOW — if they conflict, you have created an argument you will lose.

**Paste the `/quote` scope document into the SOW's sections 2, 3 and 4**
(deliverables, exclusions, timeline). That is what the quote tool is for: the
proposal template's "what's NOT included" list is the section that prevents
80% of scope-creep arguments, and the quote tool generates it for you.

**Two MSA clauses worth knowing by heart:**

- **§4.2 — you keep your own tools.** Studio retains ownership of pre-existing
  libraries, methodologies and internal frameworks. *This is what makes
  `commerce-core` and `commerce-skeleton` legally reusable across every
  client.* Without it, reusing the fulfilment module for client B could be
  argued to belong to client A.
- **§6.2 — 30-day warranty.** Bugs free for 30 days after delivery. Beyond
  that, billed or via retainer.

**Before moving on:** SOW countersigned. Not verbally agreed — signed.

---

## Stage 3 · Money

**Do:** issue the 50% advance invoice. Record it in `/studio` → the project's
org, and add the invoice so it shows on the client's portal.

**Before moving on: the advance has cleared.** Not "invoice sent". Cleared.

---

## Stage 4 · Give the client their login

This is a **two-part job** and skipping the second part is the most common
failure. Both parts are required.

### Part A — Firebase Console (creates the password)

1. Firebase Console → **Authentication** → **Users** → **Add user**
2. Email: the synthetic address, e.g. `greenbasket@brandmintstudios.in`
   — not their real email. `/studio` shows you the exact string to paste.
3. Set a password **here**. This is the only place it will ever exist.
4. **Copy the UID** from the new row.

### Part B — `/studio` → Client Access (creates the permissions)

5. Paste the UID, pick the organisation, enter display name and username, Save.

This writes `users/{uid} = { orgId, role:'client', name, username }`.

> **Why Part B is not optional.** The Firestore rules' `me()` and `myOrg()`
> both do `get(/users/$(uid))`. With no `users` document, that client can read
> **nothing** — not their org, not their project, not their invoices. They will
> sign in successfully and land on a portal saying "No active project", with no
> error and no explanation, and then message you. Which is the exact cost the
> portal exists to remove.

### Never

- Never type a client's password into any Brand Mint screen. The Client Access
  panel takes a **UID**, never a password, by design.
- Never ask a client for a password, API key or token for *their* systems.
  Access is always *"add hello@brandmintstudios.in as a user on your own
  account."* Every requirement the quote tool prints is already worded this way.

### Verify isolation — once, ever

The first time you create a client, sign in as them in a private window and
open **`/tenancy-check`**. It reads every known org and project id as that
user and returns **Isolated** or **LEAK** with the offending ids named.

As admin it says "inconclusive" — the admin is allowed everything by design,
so a green tick there proves nothing. Until this has been run from a real
client session, tenant isolation is designed but unproven.

**Before moving on:** they can sign in at `/login` with their username and see
their own project.

---

## Stage 5 · Set up the project

On `/studio` → Manage projects:

1. **Set the project type.** This unlocks the milestone template for that
   service.
2. **Apply the milestone template** — pick a start date; the template's dates
   are counted from it. Nothing is invented; you supply the date.
3. **Edit or delete milestones that do not apply.** The template is a shape,
   not a schedule.
4. **Push the client's requirements into intake:** `/studio` → Scope & quote →
   select the same features → **Add to project intake**.

That last step is the one that earns its keep. Every "what we need from you"
line becomes a dated intake item. The client sees them on `/onboarding`, they
age on your delivery health, and the chasing happens without you sending a
message.

Then run `brand-mint-admin/ops/kickoff-checklist.md`.

**Before moving on:** `/studio` delivery health shows a real next milestone and
a real blocker count for this project — not "No milestones yet".

---

## Stage 6 · Delivery

**The client's side, weekly:** they open `/portal` and see five things — where
we are, **what we need from you** (oldest first, dated), what is waiting on
their approval, preview links, invoices.

**Your side, weekly:** update milestone status, add deliverables as they become
reviewable, tick off intake items they have cleared.

**When they ask for something not in the SOW** — and they will — this is the
moment the whole system exists for:

> *"Happy to do that. It is outside the signed scope, so let me send you a
> quick quote — I will not start until you have approved it."*

Then `npm run quote -- --features <the-new-thing>`, generate the scope
document, send it. Never "just add it". Never quote after building.

**The boundary, from your own terms:**

| | |
|---|---|
| **Free** | Anything not behaving as specified in the SOW, for 30 days after delivery |
| **Free** | 2 review rounds during the build |
| **Chargeable** | Design changes after sign-off |
| **Chargeable** | New integrations not in the SOW |
| **Chargeable** | Additional pages, screens or features |
| **Chargeable** | Review rounds 3+ at ₹15,000 each |

---

## Stage 7 · Handover

Run `brand-mint-admin/ops/handover-checklist.md`.

1. Final invoice — the remaining 50%.
2. Transfer what the MSA says transfers: repo, cloud infra, accounts.
   **Do not release the final deliverable before the balance clears.** It is
   the only leverage you have, and once it is handed over it is gone.
3. Warranty clock starts. 30 days.
4. Record the completion — mark milestones done, so delivery health tells the
   truth.

---

## Stage 8 · Retainer

Ask at handover, not later. The catalog's target is 30% of project clients
converting within 60 days.

> *"You have the site. The next 90 days is when content, performance and tools
> start compounding. Here is what a retainer looks like."*

Use `brand-mint-admin/contracts/retainer-template.md`. Key terms already in it:
3-month minimum, 30 days' notice, invoiced 1st, Net-15, 2%/month on overdue.

**A retainer is a defined scope of deliverables, not an hourly bucket**
(retainer template §5.1). Write the scope down. A retainer without a written
boundary becomes unlimited work at a fixed fee — which is precisely how
Inventory Manager ended up carrying a full commerce platform inside a
₹12,500/month arrangement.

Record it on `/studio` with `retainerStatus: signed`. Only signed counts toward
MRR — proposals render faded and are never summed.

**If any part of the retainer is paid in kind** (a subscription, a swap), record
it as `retainerInKind`. It is real value, but it cannot pay a bill, and the
break-even gauge answers "can I cover this month".

---

## Quick reference

| I need to… | Go to |
|---|---|
| Log a new lead, stamp first response | `/studio` → Leads |
| Price a scope | `npm run quote` in commerce-skeleton |
| Produce a client scope document | `/studio` → Scope & quote |
| Create a client login | Firebase Console **then** `/studio` → Client Access |
| Prove tenant isolation | `/tenancy-check`, signed in as a client |
| Set milestones from a template | `/studio` → Manage projects |
| Turn requirements into client blockers | `/studio` → Scope & quote → Add to project intake |
| See what a client sees | `/portal` |
| Contracts | `brand-mint-admin/contracts/` |
| Kickoff / handover | `brand-mint-admin/ops/` |
