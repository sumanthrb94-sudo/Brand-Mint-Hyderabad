# Moving Brand Mint from Supabase to Firebase — scoping document

**Status: DONE.** This was the scoping document; the migration has since been
carried out and the app now runs on Firebase. Kept as the record of why the
design is shaped the way it is. For operating instructions see
**`SETUP-FIREBASE.md`**.

Two things changed during implementation, both simplifications:
- **No data migration** (§6) — you had no production data, so we started fresh.
- **No composite indexes** — the portal sorts client-side instead of using
  `orderBy()`, which removed a whole deploy step. Revisit if a client ever
  accumulates more than a few hundred documents.

Firebase project: `brandmintstudios-a5eb7`.

---

## The short version

**It's worth doing, and it's smaller than it looks.** Every backend call in the
whole codebase goes through **13 lines across 3 files**. Both data layers were
written as thin wrappers, so the app above them doesn't know or care what's
underneath.

| | |
|---|---|
| Backend call sites to rewrite | 13 |
| Files that change | 5 |
| Files that don't change at all | every module in `admin/modules/`, all of `portal/wizard.js`, `shared/brief.js`, `portal/ui.js`, `admin/components.js` |
| The real work | the security rules, and testing them |
| Can you stay on the free plan? | **Yes** — if we avoid Cloud Functions (see §4) |

**What you gain:** no idle-pausing, one Google bill, native file uploads,
built-in offline, better realtime, and ~120 lines of hand-rolled cache you can
delete.

**What you lose:** SQL. That's the honest cost, and it's not nothing — see §8.

---

## 1. What replaces what

| Today | After |
|---|---|
| Supabase Auth (Google + magic link) | Firebase Auth (Google + email link) |
| Postgres tables | Firestore collections |
| RLS policies (SQL) | Security rules (`firestore.rules`) |
| `SECURITY DEFINER` helper functions | rule `function` helpers |
| `BEFORE` triggers | rule-level field guards |
| `handle_new_user()` signup trigger | client-side invite claim (§4) |
| Postgres Changes | `onSnapshot` |
| Deliverable URLs pasted by hand | Firebase Storage uploads |
| `admin/db.js` localStorage mirror | Firestore offline persistence |
| Anon key in `admin/config.js` | Web `apiKey` in the same place |

The `apiKey` in a Firebase web config is **not a secret**, exactly like the
anon key it replaces. It identifies the project; it doesn't authorise anything.
Security rules are the boundary, the same way RLS is today.

> The Admin SDK service-account JSON is a different object entirely and must
> **never** enter this repo — it would be published on your Vercel URL. Nothing
> in this plan needs it.

---

## 2. The Firestore data model

Flat top-level collections, every document carrying `clientId`. Not nested
subcollections — nesting reads nicely but makes the admin's "give me every
deliverable across all clients" query impossible without a collection-group
index, and gains nothing.

```
profiles/{uid}              { email, fullName, avatarUrl, role: 'admin'|'client' }
clientUsers/{uid}_{clientId} { uid, clientId, role: 'owner'|'member' }
invites/{emailLower}_{clientId} { email, clientId, role, invitedBy, acceptedAt }

clients/{id}                { name, contact, email, tier, onboardingStatus, ... }
projects/{id}               { clientId, name, stage, value, kickoff, due, ... }
invoices/{id}               { clientId, number, total, status, dueDate, ... }
leads/{id}                  { name, email, message, status, ... }

milestones/{id}             { clientId, projectId, title, status, dueDate, position }
deliverables/{id}           { clientId, projectId, title, status, version, url, ... }
messages/{id}               { clientId, projectId, authorId, authorRole, body, ... }
onboarding/{clientId}       { answers, step, status, submittedAt }
settings/singleton          { studioName, gstin, bank, ... }
```

Two deliberate choices:

- **Composite document IDs** (`{uid}_{clientId}`, `{emailLower}_{clientId}`).
  This is what makes membership checkable in a rule with a single `exists()`
  and no query. It's the Firestore equivalent of a unique constraint.
- **`clientId` denormalized onto every row.** Required — rules can't join.

### The one Firestore constraint that shapes everything

**Rules filter documents; they do not filter queries.** In Postgres,
`select * from milestones` quietly returns only your rows. In Firestore, a
query that isn't already provably within what the rules allow is **rejected
outright**.

So every client-side read must carry its own `where('clientId','==',myClientId)`.
Good news: `portal/data.js` already does exactly this on every call
(`.eq('client_id', clientId)`), because RLS scoping and query scoping happened
to line up. That file ports almost mechanically.

The admin reads unfiltered (`select * from leads`). That still works, because
`isAdmin()` doesn't depend on the document — a rule that grants access without
inspecting `resource` satisfies the whole query.

---

## 3. Security rules — the RLS translation

This is the bulk of the work. Roughly 200 lines. Sketch:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn()  { return request.auth != null; }
    function uid()       { return request.auth.uid; }

    // The analogue of is_admin(). One billed read, cached per request.
    function isAdmin() {
      return signedIn() &&
        get(/databases/$(database)/documents/profiles/$(uid())).data.role == 'admin';
    }

    // The analogue of my_client_ids() / can_see_client().
    function isMember(clientId) {
      return signedIn() &&
        exists(/databases/$(database)/documents/clientUsers/$(uid() + '_' + clientId));
    }
    function canSee(clientId) { return isAdmin() || isMember(clientId); }

    // --- profiles: replaces the guard_profile_role() trigger -------------
    match /profiles/{userId} {
      allow read:   if uid() == userId || isAdmin();
      allow create: if uid() == userId && request.resource.data.role == 'client';
      allow update: if isAdmin() ||
                    (uid() == userId &&
                     request.resource.data.role == resource.data.role);
      allow delete: if isAdmin();
    }

    // --- deliverables: replaces guard_deliverable_review() ---------------
    match /deliverables/{id} {
      allow read: if isAdmin() ||
                  (isMember(resource.data.clientId) && resource.data.status != 'draft');
      allow create, delete: if isAdmin();
      allow update: if isAdmin() || (
        isMember(resource.data.clientId) &&
        resource.data.status != 'draft' &&
        request.resource.data.status in ['approved', 'revision_requested'] &&
        // The client may touch these fields and nothing else. This is the
        // rules equivalent of the trigger that froze title/url/version.
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'revisionNote', 'reviewedBy', 'reviewedAt', 'updatedAt']) &&
        request.resource.data.reviewedBy == uid()
      );
    }

    // --- messages: replaces guard_message_author() ----------------------
    match /messages/{id} {
      allow read:   if canSee(resource.data.clientId);
      allow create: if canSee(request.resource.data.clientId) &&
                    request.resource.data.authorId == uid() &&
                    request.resource.data.authorRole == (isAdmin() ? 'admin' : 'client');
      allow update: if canSee(resource.data.clientId) &&
                    request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly([isAdmin() ? 'readByAdmin' : 'readByClient']);
      allow delete: if isAdmin();
    }

    // --- leads: public form inserts, admin reads ------------------------
    match /leads/{id} {
      allow create: if true;          // the public contact form
      allow read, update, delete: if isAdmin();
    }

    // --- admin-only ------------------------------------------------------
    match /settings/{id} { allow read, write: if isAdmin(); }
    match /invites/{id}  { allow read, write: if isAdmin(); }   // plus §4
  }
}
```

**All three Postgres triggers translate cleanly.** `affectedKeys().hasOnly()`
is genuinely expressive — arguably more readable than the PL/pgSQL it replaces.
This surprised me; I expected it to be the hard part.

**The cost to know about:** each `get()`/`exists()` in a rule is a **billed
document read**, and there's a fixed budget per request (10 for a single-doc
operation, 20 for a query). `canSee()` costs up to two. At your volume this is
noise, but it's why the model denormalizes `clientId` instead of joining.

---

## 4. The invite trigger — and how to avoid needing Cloud Functions

The migration's one genuinely awkward piece. Today, `handle_new_user()` fires
inside Postgres when a client signs in for the first time and converts their
pending invite into a membership. Firestore has no such hook.

**Option A — Cloud Function on `auth.user().onCreate()`.** Direct equivalent,
clean. But **Cloud Functions require the Blaze plan**, i.e. a billing account
attached to the project. The free allowance would cover you many times over,
but it does mean a card on file.

**Option B — client-side claim, no Functions, stay on the free Spark plan.**
On first sign-in the portal creates its own membership, and the rules only
permit it if a matching invite already exists:

```js
match /clientUsers/{id} {
  allow read: if resource.data.uid == uid() || isAdmin();
  allow write: if isAdmin();

  // A user may create exactly their own membership, and only where you
  // already left an invite for their verified email address.
  allow create: if signedIn()
    && request.auth.token.email_verified == true
    && id == uid() + '_' + request.resource.data.clientId
    && request.resource.data.uid == uid()
    && exists(/databases/$(database)/documents/invites/$(
         request.auth.token.email + '_' + request.resource.data.clientId));
}
```

Two things this depends on, both fine:

- **`email_verified` must be checked.** Google sign-in sets it true. Without
  this check, someone could register an unverified address matching an invite
  and claim it. This is the security-critical line in the whole file.
- **Rules have no `lower()`.** Invite document IDs must be written
  pre-lowercased by the admin app, which controls that write anyway.

**Recommendation: Option B.** It keeps you on the free plan with no billing
account, and the security property is equivalent — access still requires an
invite you created. Option A stays available if you later want real invite
emails, which need a Function regardless.

---

## 5. What actually changes in the code

| File | Change | Size |
|---|---|---|
| `auth/session.js` | Firebase Auth instead of Supabase Auth. `signInWithPopup(GoogleAuthProvider)`, `sendSignInLinkToEmail`, `onAuthStateChanged`. `requireRole()`, `getProfile()`, `peekSession()` keep their signatures. | rewrite, ~same length |
| `admin/db.js` | 6 call sites. `TABLE` map goes away — Firestore takes camelCase collection names directly, so `toSnake`/`toCamel` can go too. The localStorage mirror can be **deleted** in favour of `persistentLocalCache`. | net **smaller** |
| `portal/data.js` | 6 call sites. Already client-scoped, so near-mechanical. | small |
| `script.js` | 1 call site — the public lead insert. | trivial |
| `admin/config.js` | Firebase web config instead of URL + anon key. | trivial |
| `firestore.rules` | **new** — §3 | ~200 lines |
| `firestore.indexes.json` | **new** — composite indexes for the ordered client-scoped queries | ~20 lines |
| `supabase/` | delete once cut over | — |

**Unchanged:** every file in `admin/modules/` (all ten), `admin/components.js`,
`portal/app.js`, `portal/ui.js`, `portal/wizard.js`, `shared/brief.js`, all
CSS, all HTML except the config reference. That's the payoff of having put the
data access behind a wrapper.

Loading the SDK stays build-step-free, matching how `supabase-js` loads today:

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
```

`vercel.json`'s CSP needs `https://www.gstatic.com` in `script-src`, and
`connect-src` needs `*.googleapis.com` and `*.firebaseio.com` in place of the
Supabase origin.

---

## 6. Moving the data

Volume is tiny — demo leads, a handful of clients, three invoices.

1. Export from Supabase: `select json_agg(t) from <table> t` per table, or the
   dashboard's CSV export.
2. A one-off Node script with the Admin SDK writes them into Firestore,
   preserving `id` as the document ID so nothing re-points. **Run locally,
   with a freshly generated service-account key, and delete the key after.**
3. `clientUsers` is re-derived, not migrated — see below.

**Auth users do not migrate.** Firebase issues its own UIDs. Since nobody real
is onboarded yet, the clean move is: migrate the business data, then re-invite
each client. If that changes before we cut over, Firebase has an import path
(`firebase auth:import`) but it can't carry Supabase's password hashes for
Google-federated users, so re-inviting stays simpler.

---

## 7. How we'd test it

Rules are harder to be confident about than SQL policies — there's no `psql` to
just connect as a user and see what comes back. The Firebase Emulator Suite
covers this, and unlike the current setup it can be genuinely automated:

```bash
firebase emulators:start --only firestore,auth
```

A rules test suite (`@firebase/rules-unit-testing`) asserting the cases that
matter:

- an anonymous request reads nothing but can create a lead
- a client reads their own milestones and **not** another client's
- a client cannot read a `draft` deliverable
- a client approving a deliverable cannot also change its `url` or `version`
- a client cannot set their own `role` to `admin`
- a client cannot post a message with `authorRole: 'admin'`
- a user with no invite who signs in gets **nothing**

That's a real improvement on today — those properties are currently only
argued for in SQL comments, not tested.

---

## 8. The honest costs

**You lose SQL.** This is the one that will actually bite. Today you can open
the Supabase SQL editor and ask "what did we bill last quarter, by client" in
one query. In Firestore you export to BigQuery (there's an extension) or read
documents and aggregate in code. For a studio doing revenue reporting, that's
a real regression, and it's the single strongest argument for staying.

**Rules fail loudly, not quietly.** A missed `where()` clause becomes a
`permission-denied` error at runtime rather than an empty result. More brittle
to get right; arguably safer once right.

**No schema.** Nothing stops a typo writing `clinetId`. Postgres would reject
it. You trade migrations-as-a-chore for no-migrations-and-no-guardrails.

**Effort.** Comparable to the work that produced the current branch — a focused
session for me, plus your testing. Not a weekend of your time, but not an hour
either.

---

## 9. Verdict

**Do it, on Option B (no Cloud Functions, free plan).**

Not because Firestore is the better database — for this relational shape,
Postgres genuinely is. Do it because the deciding factors here aren't
architectural:

- your project sleeping every week is a real, recurring annoyance
- one Google bill and one console is worth something when you run this alone
- Storage and offline arrive for free and delete code you'd otherwise maintain
- you already know Firebase; you'd be maintaining Postgres reluctantly

A backend you'll actually operate beats a better one you won't. The thing that
was genuinely broken — no auth, no access control — is fixed either way, and it
was never a backend problem.

**Reconsider if** invoice and revenue reporting matters more than the above. If
you'll want to ask arbitrary financial questions of this data, keep SQL, put
the ~$25/mo on Supabase Pro to stop the pausing, and spend the migration effort
on features instead.

---

## What I need from you to start

1. **Revoke the service-account key** that was shared
   (key ID `20f2839b7b297eb54d8ea49f61cb740ccd871586`). Nothing here needs it.
2. **The web app config** — Firebase Console → ⚙️ Project settings → General →
   *Your apps* → Web app → *SDK setup and configuration*. Safe to paste; it's
   public by design.
3. **Option A or B** for the invite flow (recommendation: **B**).
4. Confirm Firestore is created in **Native mode**, and pick a region —
   `asia-south1` (Mumbai) is closest to Hyderabad and cannot be changed later.
