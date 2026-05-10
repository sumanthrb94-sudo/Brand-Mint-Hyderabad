# Handover Checklist — Closing an Engagement Cleanly

Run this 7 days before launch. Owner: lead. Client receives every item by launch + 24 hours.

## 7 days before launch

- [ ] All in-scope features marked done in Linear / Notion
- [ ] Internal QA pass: Lighthouse 90+ on all 4 axes (web), all features tested (tools)
- [ ] Mobile QA on real devices (iPhone, Android, iPad)
- [ ] Cross-browser check (Chrome, Safari, Firefox, mobile Safari)
- [ ] Accessibility quick-pass (axe DevTools, WCAG AA)
- [ ] Content review: no Lorem ipsum, all images load, all links go somewhere
- [ ] Forms tested end-to-end with a real submission
- [ ] OG card validated in Facebook Debugger + WhatsApp preview
- [ ] DNS / SSL verified ready for switchover
- [ ] Backup of pre-launch state archived

## 3 days before launch

- [ ] Final invoice (50% balance) issued
- [ ] Handover meeting scheduled (60 min, video)
- [ ] Loom walkthrough recorded (30 min max) and shared
- [ ] Repo cleaned up: README updated, secrets removed, branches pruned
- [ ] Documentation site updated (if applicable)

## Launch day

- [ ] DNS switched (TTL pre-lowered 24h before)
- [ ] SSL active and verified
- [ ] Production deploy successful
- [ ] Smoke test on production
- [ ] Analytics firing (test with their email/device)
- [ ] Forms delivering to client's inbox
- [ ] OG cards rendering on social platforms (test Twitter, LinkedIn, WhatsApp)
- [ ] Status update sent in Slack: "We're live. Here's what to look at."

## Within 24 hours of launch

- [ ] Repo transferred to client's GitHub org (Brand Mint keeps read-only access for 90 days)
- [ ] Cloud accounts (Vercel, Supabase, etc.) ownership transferred OR client billing details connected
- [ ] Figma file: client gets editor access; Brand Mint downgrades to view-only
- [ ] All credentials handed over via 1Password share / Bitwarden / encrypted doc
- [ ] Final invoice payment confirmed received

## Within 7 days of launch

- [ ] Handover meeting completed (use agenda below)
- [ ] Brand kit delivered (logos, colours, type, templates) in `/brand-kit/` folder
- [ ] Documentation walk-through Looms recorded (15-30 min per major system)
- [ ] 30-day warranty officially begins; warranty period clearly communicated to client
- [ ] Case-study consent conversation (if not already had)

## Handover meeting agenda (60 min)

| Min | Topic |
|---|---|
| 0-10 | Recap: what we set out to do, what we shipped, against the original SOW |
| 10-25 | Live walkthrough of the deliverable — every key feature touched |
| 25-35 | What you (the client) own now: repo, accounts, credentials, files |
| 35-45 | What Brand Mint stays available for: 30-day warranty, retainer options |
| 45-55 | Next steps: content, performance, iteration — start the retainer conversation here |
| 55-60 | Open Q&A |

End with:
> "Two things to nail down today. First, your single point of contact for the next 30 days for any bug or question — it's still me. Second, are we OK to publish a case study after 90 days, with your permission on the specific numbers?"

## Case-study consent

For every engagement, end-of-handover ask:

1. Can we mention you publicly as a client? (yes/no)
2. Can we publish the work as a case study with your numbers? (with date/timeline approval)
3. Can we use your logo on our /work page?
4. Will you do a 1-paragraph written quote we can use?

Get it in writing — a Slack message saying "yes to all" is enough. Reuse the consent for press, decks, and pitches.

## Retainer conversation (during handover)

The cleanest moment to pitch the retainer is the last 5 minutes of the handover:

> "You've got the site / the tool live. Here's the data point: 60% of clients see their best metrics in the 90 days *after* launch — when content, performance, and iteration compound. We have a `[CONTENT/PERF/AI]` retainer that starts at ₹`[X]`/mo. Want me to send a 1-page note on what it would cover for you specifically?"

Don't push. Send the 1-pager. Re-touch in 14 days.

## 30-day warranty period

What's covered:
- Bug fixes on shipped functionality
- Browser/device-specific rendering issues
- Form delivery problems
- DNS / SSL / deploy issues

What's not covered:
- New features or design changes
- Content updates
- Third-party integration changes (e.g., if they swap analytics tool)

Response time: 1 business day for triage; 3 business days for fix unless critical.

After 30 days: bug fixes go through retainer, hourly billing (₹4,500/hr), or back-pay-fixed-bid if scoped.

## Post-mortem (internal, 7 days after launch)

30-min team session:

- What went well? (3 specific things)
- What was painful? (3 specific things)
- What would we change for the next engagement? (3 commitments)

Document in `08-aftercare/` of the engagement folder. Skim before kicking off the next similar engagement.

## Archive

After warranty ends (30 days post-launch), the engagement folder moves to `archive/[YYYY]/`. Searchable, but out of the active workspace.
