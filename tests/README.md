# Tests

Both suites install their dependencies **outside this repo**. There is no
`package.json` here and there must not be one — Vercel serves this directory as
static files with no build step, and the deployed site has zero runtime
dependencies. See CLAUDE.md §3.

## rules.test.mjs — the security boundary

Proves tenant isolation against the Firestore emulator. Deterministic, needs no
credentials, touches no live data, runs offline. This is the suite that answers
"can client A reach client B's data" — the question production cannot answer
safely.

```bash
cd /tmp && npm i @firebase/rules-unit-testing firebase firebase-tools && cd -
ln -sfn /tmp/node_modules node_modules          # ESM ignores NODE_PATH
npx firebase emulators:exec --only firestore --project demo-bm \
  "node --test tests/rules.test.mjs"
```

Needs Java (the Firestore emulator is a JVM binary).

21 tests covering: anonymous lockout, cross-tenant reads, the URL-editing
attack, the two writes a client may make, `onlyTouches` smuggling, privilege
escalation, admin identity coming from the token rather than a `users`
document, and the empty-portal failure mode when the `users` document is
missing.

## e2e.mjs — the pages

Drives real Chromium over every page: marketing claims stay removed, services
stay intact, protected routes render nothing to a signed-out visitor, the Sign
in CTA clears 4.5:1, no page but `/login` has a password field.

```bash
cd /tmp && npm i playwright && cd -
node tests/e2e.mjs
```

Six auth checks need the Firebase CDN. Where it is blocked they report SKIP,
never a pass — a green tick for a check that did not run is worse than a red
one. Each has a static counterpart that still runs.
