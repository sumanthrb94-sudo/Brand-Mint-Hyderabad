# Brand Mint

Online stores for Indian brands, in four fixed-price tiers. Built in Hyderabad.

This repo is the whole thing:

- **`/`** — the home page. Four stores, one price each. Pick one, sign in with Google.
- **`/login`** — Google sign-in. That's the entire sign-up: we get your email, you get a portal.
- **`/portal`** — where a client watches their project: agreement, deposit, then live timeline, files to approve, invoices, messages.
- **`/admin`** — where the studio runs it: leads with the tier they picked, one-click convert, delivery, invoices.

Static HTML/CSS/JS, no build step, served by Vercel. Firebase (Auth + Firestore) behind it. **`firestore.rules` is the only security boundary** — the API key in `firebase/config.js` is public by design.

## Run it

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Sign-in and data won't work until Firebase is configured — **`SETUP-FIREBASE.md`** is the 20-minute checklist.

## Change the tiers

`shared/tiers.js`. The home page, sign-in, portal and admin all read from it.

## Working on it with Claude

Read `CLAUDE.md` first.
