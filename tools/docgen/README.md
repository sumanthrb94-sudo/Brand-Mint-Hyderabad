# Manual generator

Regenerates `docs/Brand-Mint-Operations-Manual.pdf` from the live pages, so the
screenshots can never drift from the application.

```bash
cd /tmp && npm i playwright && cd -
NODE_PATH=/tmp/node_modules node tools/docgen/shoot.mjs   # 18 screenshots
NODE_PATH=/tmp/node_modules node tools/docgen/build.mjs   # assemble + print PDF
```

Playwright installs outside the repo — this project has no package.json and
must not gain one.

## How it works

`stub.mjs` serves stand-in Firebase modules in place of the gstatic CDN, so the
pages render without a live Firebase project. Crucially the stub **enforces
firestore.rules** — organisation, project, invoice and subcollection reads are
all checked against the signed-in user's org. Without that the tenancy page
would report a LEAK that does not exist in production, and the manual would
teach the reader something false.

`seed.mjs` holds representative data: the real orgs, plus the milestones,
intake items and deliverables a live project would have, so the screenshots
show a working system rather than a page of empty states.

Everything in the manual is captured, never retyped — including the quote
CLI output, which is executed at build time.
