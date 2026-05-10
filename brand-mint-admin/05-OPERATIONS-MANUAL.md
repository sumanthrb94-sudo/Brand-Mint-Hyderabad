# 05 · Operations Manual

How an engagement runs from inquiry to invoice. Reference for everyone in the studio.

## The 7 stages

```
1. Inquiry  →  2. Qualified  →  3. Workshop  →  4. Proposal  →
5. Signed   →  6. Active     →  7. Closed (case-study eligible)
```

Each stage has a single owner, a single artefact, and a single transition criterion.

## Stage tracker (simple — start with this in Notion or Airtable)

| Field | Type |
|---|---|
| Lead name | text |
| Company | text |
| Source | dropdown |
| Stage | dropdown (1-7) |
| Owner | dropdown |
| Service interest | dropdown |
| Estimated value | currency |
| Workshop date | date |
| Proposal sent | date |
| Signed date | date |
| Kickoff date | date |
| Delivery date | date |
| Notes | long text |

Review every Monday 9 AM IST in a 30-min sales/ops standup.

## The standard engagement timeline

For a typical ₹3.5 L Studio-tier site (5-week project):

| Week | Day | Milestone | Owner |
|---|---|---|---|
| W0 | Mon | Kickoff call (60 min) | Lead |
| W0 | Tue | Slack channel + access checklist | Ops |
| W0 | Wed | Mood-board direction shipped | Designer |
| W1 | Mon-Fri | Daily Loom updates | Lead |
| W1 | Fri | Demo #1: visual direction lock | Lead |
| W2 | Mon-Fri | Design system + key screens | Designer |
| W2 | Fri | Demo #2: design system review | Lead |
| W3 | Mon | Build sprint begins | Engineer |
| W3 | Fri | Demo #3: live URL on staging | Engineer |
| W4 | Mon-Wed | Content integration + QA | All |
| W4 | Thu | Demo #4: pre-launch | Lead |
| W4 | Fri | Buffer day | All |
| W5 | Mon | Launch | Engineer |
| W5 | Tue | Handover meeting + final invoice | Lead |
| W5 | Wed-Fri | 30-day warranty period begins | All |

## Communication cadence

| Channel | Cadence | Purpose |
|---|---|---|
| Loom | Daily (W0-W2), weekly after | Async progress |
| Slack | Real-time | Quick questions, file shares |
| Demo call | Weekly Friday 4 PM IST | Decision-making |
| Email | Milestones only | Invoicing, formal updates |

Internal: daily standup 9:30 AM IST in Slack (15 min), weekly studio review Friday 5 PM.

## Tools

| Function | Tool | Cost |
|---|---|---|
| Project mgmt | Linear or Notion | Free–₹500/user/mo |
| Files / handoff | Figma + GitHub | Free–₹1500/mo |
| Comms | Slack (client connect) | Free |
| Async video | Loom | Free–₹1200/mo |
| Time tracking | Toggl or Harvest | Free–₹800/mo |
| E-signature | DocuSeal (self-hosted) | Free |
| Invoicing | Zoho Books | ₹600/mo |
| Email | Google Workspace | ₹136/user/mo |
| Hosting | Vercel + Cloudflare | Pass-through to client |

## Handover package — every engagement gets these

1. **Live URL or app URL** + DNS / SSL handed to client
2. **GitHub repo transferred** to client org (we keep read access for 90 days)
3. **Figma file** with editor access for client
4. **Brand kit** (logos, colours, type) in `/brand-kit` folder
5. **Documentation site** with how-to guides for any custom feature
6. **Loom walkthrough** of every key system (15-30 min)
7. **30-day warranty** explainer (what's covered, what's not)

## After-care SLA

| Tier | Response time | Coverage |
|---|---|---|
| 30-day warranty (free, included) | 1 business day | Bug fixes only, no new scope |
| Retainer client | 4 working hours | Anything in retainer scope |
| Past client (no retainer) | 3 business days | Best-effort, paid hourly |

## What can go wrong (and the playbook)

### Scope creep

**Symptom:** "Can we also add X?" mid-engagement.
**Playbook:** Acknowledge in writing within 24 hrs. Quote it as a Change Order. Never absorb without invoicing.

### Client disappears

**Symptom:** No reply for 5 business days.
**Playbook:** Email day 6 with proposed paused-state and pause clock. Day 10: pause project, document state, send "ready when you are" message. Don't chase.

### Designer/engineer sick or capacity gone

**Symptom:** Lead can't deliver in week.
**Playbook:** Notify client same day with new ETA. Default to extending end date by 5 days; if more, give partial refund or scope reduction.

### Quality bar slipping

**Symptom:** Internal review reveals work isn't shippable.
**Playbook:** Lead must call founder before client demo. Don't ship subpar work to meet a date. Reschedule, eat the cost.

## Standard files in every engagement folder

```
[YYYY-MM]-[ClientShortname]/
├── 01-discovery/           # Notes, recordings
├── 02-workshop/            # Mint workshop output
├── 03-proposal/            # Signed SOW + invoice copies
├── 04-design/              # Figma exports, mood boards
├── 05-build/               # Repo link + deploy URLs
├── 06-content/             # Copy, assets, photos
├── 07-handover/            # Final deliverables
└── 08-aftercare/           # Warranty issues, retainer notes
```

Stored in Google Drive or company Notion. Same structure every time.
