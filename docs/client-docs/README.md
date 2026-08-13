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
  → 30-day warranty
  → Care Plan starts
```
