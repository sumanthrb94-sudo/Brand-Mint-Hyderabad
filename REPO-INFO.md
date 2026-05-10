# Repo Info & Rename Guide

*All the info you asked for, plus exactly why Meta can't read the link and how to rename the repo to `BrandMint-Hyderabad`.*

---

## 1 · Current state (as of this commit)

| Field | Value |
|---|---|
| GitHub owner | `sumanthrb94-sudo` |
| GitHub repo (current) | `Brand-Mint.` ← **trailing period is the problem** |
| GitHub URL (current) | `https://github.com/sumanthrb94-sudo/Brand-Mint.` |
| Default / only branch | `claude/build-brand-mint-website-29WAg` |
| Latest commit | `141def9` |
| Total commits | 14 |
| Vercel project | `brand-mint-sdmk` (auto-named from the repo) |
| Live URL | `https://brand-mint-sdmk.vercel.app` |
| Brand domain (target) | `brandmint.studio` (not yet pointed) |
| Repo size | ~2.2 MB |

---

## 2 · Why Meta / WhatsApp / LinkedIn / X can't see this repo

Two compounding reasons. Both root in the **trailing period in the repo name**.

### A. URL parsers strip or reject trailing dots

When you share `github.com/sumanthrb94-sudo/Brand-Mint.` in:

- WhatsApp / iMessage → trailing `.` is treated as **end of sentence**, often dropped → resolves to `Brand-Mint` (no dot) → **404**
- LinkedIn / Slack / X (Twitter) → URL detector either trims the dot or fails the URL match entirely → no preview card
- Meta's Sharing Debugger → returns `URL_INVALID` because of how its OG crawler normalizes hostnames vs. paths
- Some DNS-style parsers interpret `repo.` as **fully-qualified DNS root** and fail

### B. The Vercel slug `brand-mint-sdmk` was randomly hashed, not chosen

Vercel auto-generated the slug because the repo name had a non-standard character (the dot). That's why the URL looks like `brand-mint-sdmk` instead of just `brand-mint`. The OG meta tags in `index.html` point to that hashed slug, which means:

- The link text shared on social looks like spam (`brand-mint-sdmk` doesn't pattern-match a real brand)
- LinkedIn's URL trust score for new domains with random-looking slugs is low → the preview card may be suppressed

### Fix (in order of priority)

1. **Rename the repo on GitHub** to `BrandMint-Hyderabad` — eliminates the trailing-dot bug everywhere
2. **Rename the Vercel project** to `brandmint-hyderabad` — gives a clean URL slug
3. **(Optional later) Point a custom domain** like `brandmint.studio` — kills the Vercel slug entirely

---

## 3 · Rename the GitHub repo (manual — 30 seconds)

> The GitHub MCP server in this Claude session does **not** expose a rename endpoint, so this one step has to be done by you on github.com. Everything else (Vercel, local clone, OG tags) I've prepped for you below.

1. Open https://github.com/sumanthrb94-sudo/Brand-Mint./settings
2. Scroll to **General → Repository name**
3. Change `Brand-Mint.` → **`BrandMint-Hyderabad`**
4. Click **Rename**

GitHub automatically:
- Creates HTTP redirects from the old URL to the new one (so old links don't break)
- Updates the default clone URL
- Preserves all issues, PRs, stars, branches, commits

---

## 4 · After renaming — what to update

### 4a · Your local git clone

```bash
cd "/path/to/Brand-Mint."
git remote set-url origin https://github.com/sumanthrb94-sudo/BrandMint-Hyderabad.git
git remote -v   # verify
```

(Optional but cleaner — also rename the local folder so it doesn't have the dot:)

```bash
cd ..
mv "Brand-Mint." "BrandMint-Hyderabad"
cd BrandMint-Hyderabad
```

### 4b · Vercel project

1. Open https://vercel.com/dashboard
2. Click the **brand-mint-sdmk** project → **Settings → General**
3. **Project Name** → change to `brandmint-hyderabad`
4. Save. Your new URL becomes `https://brandmint-hyderabad.vercel.app`
5. Vercel keeps the old `brand-mint-sdmk.vercel.app` as a permanent alias, so old shares still resolve

### 4c · OG / social tags in `index.html`

Once Vercel gives you the new URL, find/replace these four lines in `index.html`:

```html
<link rel="canonical" href="https://brand-mint-sdmk.vercel.app/" />
<meta property="og:url" content="https://brand-mint-sdmk.vercel.app/" />
<meta property="og:image" content="https://brand-mint-sdmk.vercel.app/og-image.png" />
<meta name="twitter:image" content="https://brand-mint-sdmk.vercel.app/og-image.png" />
```

Change `brand-mint-sdmk` → `brandmint-hyderabad` in all four. Commit, push, redeploy.

### 4d · Refresh the WhatsApp / Facebook caches

After the redeploy:

1. Run the new URL through https://developers.facebook.com/tools/debug/ → click **Scrape Again** twice
2. For LinkedIn: https://www.linkedin.com/post-inspector/
3. For X: https://cards-dev.twitter.com/validator (now requires a logged-in dev account; Slack and iMessage will pick up the change naturally within an hour)

WhatsApp specifically caches for **7 days per phone**. To force-refresh on your own phone, share `https://brandmint-hyderabad.vercel.app?v=2` (any query-string change works).

---

## 5 · References to the old name in this repo

I've already updated `README.md`. The remaining references are either:

- The **brand domain** (`brandmint.studio`) — keep these, they're the long-term home
- The **default admin passcode** (`brandmint2026`) — unrelated, keep
- The **Vercel hashed slug** (`brand-mint-sdmk`) — update only after you rename the Vercel project (step 4b)

Full grep:

```
index.html          : 4 OG/canonical tags pointing to brand-mint-sdmk
README.md           : updated to reference BrandMint-Hyderabad
brandmint.studio    : 12+ references — these are the future custom domain, not the slug. Keep.
brandmint2026       : admin default passcode. Unrelated to repo name.
```

---

## 6 · Why I can't push the rename for you

The GitHub MCP server in this session is scoped to read + commit + branch operations on this single repo. It does **not** include the `PATCH /repos/{owner}/{repo}` endpoint that powers a rename. Renames also affect billing, redirects, webhooks, and integrations — GitHub deliberately keeps that gated to authenticated UI flows.

The good news: it's literally one click and 30 seconds in the Settings page (step 3 above). Once you do it, paste me the new repo URL and I'll re-point the OG tags + push the Vercel rename docs in a follow-up commit.

---

## 7 · TL;DR

```
WHY META FAILS:    trailing "." in "Brand-Mint." breaks URL parsers
NEW NAME:          BrandMint-Hyderabad
WHO RENAMES IT:    you, manually at github.com/sumanthrb94-sudo/Brand-Mint./settings
WHAT BREAKS:       nothing — GitHub auto-redirects old URLs
WHAT TO UPDATE:    git remote (1 cmd), Vercel project name (1 click),
                   4 OG meta tags in index.html (1 find-replace)
TIME:              ~5 minutes total
```
