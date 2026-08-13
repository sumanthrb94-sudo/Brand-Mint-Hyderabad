# Client Documentation Pack

Templates for running an ecommerce project from first enquiry to handover.

## How to use

Copy this whole folder into each new client repo as `/docs`. Fill in the placeholders. Delete templates you don't need for that engagement.

Placeholders are written as `{{LIKE_THIS}}`.

## Folder map

| Folder | When | Documents |
|---|---|---|
| `01-sales` | Before money | Proposal, SOW, Intake Questionnaire |
| `02-build` | During build | Kickoff, Weekly Update, Change Request, UAT Plan |
| `03-launch` | Go-live | Go-Live Checklist, Handover, Warranty |
| `04-ongoing` | After | Care Plan Agreement |
| `internal` | Never send to client | Payment Tracker, Project Checklist, Risk Log |

## The rule that protects you

Every document in `01-sales` is signed and the first payment has **cleared** before anything in `02-build` begins. Not "signed." Cleared.

## Order of operations

```
Enquiry
  → Intake Questionnaire (client fills)
  → Proposal (you send)
  → SOW (both sign)
  → Invoice 1 sent, 50%
  → PAYMENT CLEARS  ← work starts only here
  → Kickoff
  → Build, weekly updates every Friday
  → Staging handover
  → UAT, 5 working days
  → Sign-off
  → Invoice 2 sent, 50%
  → PAYMENT CLEARS  ← go-live only here
  → DNS switch, launch
  → Handover pack + walkthrough video
  → Warranty: 30 days, or 60 on Commerce
  → Care Plan starts
```

## Where the numbers come from

Prices, lengths, warranties, add-ons, care plans and the client-responsibilities
list all live in one place — `TIERS`, `CARE_PLANS`, `ADD_ONS` and
`CLIENT_PROVIDES` in `assets/bm-app.js` — and `tests/tiers.test.mjs` restates
them independently so a change in one place fails the suite rather than passing
silently. Fill these templates from there, not from memory.

The client-responsibilities list in particular must match `CLIENT_PROVIDES`
exactly: the SOW says the delivery date extends day for day while any of it is
outstanding, and the portal raises that same list as dated intake the moment an
engagement is created. If the two ever disagree, the portal is chasing things
the client never agreed to — and not chasing the ones they did.

## Two things stay blank on purpose

- **The supplier GSTIN.** Brand Mint is not GST registered yet, so it is left
  off the document entirely rather than filled with a placeholder. A tax number
  on a signed agreement that does not exist is a false statement, not a draft.
  Prices are still written as exclusive of 18% GST — that is what the client
  will owe once registration completes. The proposal deliberately shows no GST
  row and no GST-inclusive total for the same reason: quoting a tax we cannot
  then invoice bills the client 18% we may not collect and denies them the
  input credit they think they are buying.
- **Anything that would be a client credential.** Every access request is
  worded as *add hello@brandmintstudios.in to your own account*. Never ask a
  client for a password, an API key or a dashboard login — if one landed in
  this system, one breach would become their breach.
