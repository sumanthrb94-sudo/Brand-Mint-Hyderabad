# Branch Comparison Evidence

## Verified Vercel deployment state

The Vercel project is `brand-mint-sdmk`. On 13 August 2026, the production aliases—including `www.brandmintstudios.in`—were restored to deployment `dpl_9f8i9yZw5qGsJcsCro7RuGdQ72iz`. Vercel’s deployment inspector identifies that release as source branch `claude/new-session-glceza` at commit `811c8cb32db98c0e6e3cd214e8e7732a083f7848` with the commit subject `refactor: delete Pipeline's three analytics panels`.

The previously promoted Claude release was deployment `dpl_3Hsw98SdmfZVrT1vjuHAyqchLcSo`, source commit `820beace6783a4e8011921115a4245716f61f30c`. The Agency OS branch `manus/brand-mint-agency-os` remains unchanged at `a672891247c5fa7d2857c8a5c791ea1d8e3c5139`.

## Claude branch evidence

The Claude branch README defines a static HTML/CSS/JavaScript marketing site with client portal and studio dashboard routes embedded into the same site. Its declared operational stack is Firebase Auth and Firestore, with no build step or server. Its `firestore.rules` file implements roles including admin, partner, collaborator, finance, and client at the database rule layer, including organization-scoped client access, role-dependent project/deliverable/invoice permissions, and append-only activity records.

The branch also contains a separate `/admin` area with `admin/config.js`, `admin/db.js`, and `admin/supabase.js`. Those files explicitly describe a Supabase-backed/offline-first admin synchronization path. The branch therefore contains two distinct data-service implementations: Firebase/Firestore for the studio/client portal and Supabase code in the admin area.

The documented browser E2E suite was executed in an isolated checkout using the installed Chromium binary. It reported 24 of 25 checks passing with zero skipped. Its one failure was a content expectation mismatch: the test expected named service/menu labels and INR prices that were absent from the current page.

## Agency OS evidence

The Agency OS is a React/Vite client with an Express/tRPC server, Drizzle/MySQL database model, Manus OAuth identity, S3-backed document/invoice file records, and server-generated invoice PDFs. It has client onboarding, four versioned legal acceptance records, role-based CEO/client access, client-scoped projects and files, invoices, documents, deliverables, and notifications.

Its recorded test pass consists of a successful TypeScript check plus 7 passing Vitest cases across authorization, legal-acceptance validation, invoice calculations, invoice PDF bytes, and logout behavior. An independent review identified production-readiness risks: potential route-level UI guard coverage, N+1 project deliverable queries, base64 file-upload payload limits, email-based client binding, and strict database UTC/session-timezone verification.
