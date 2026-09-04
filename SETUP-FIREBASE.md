# Switching Brand Mint on — 20 minutes, once

The code is done and running on **Firebase** (project `brandmintstudios-a5eb7`).
These are the steps only you can do, because they live in the Firebase console.

**Until you finish steps 1–3 nothing will load** — the app has placeholder
config values and no security rules. That's deliberate; it fails closed.

Do them in order.

---

## What you're switching on

Two doors, one Firestore database.

| | You (agency) | Your client |
|---|---|---|
| URL | `/admin` | `/portal` |
| Who gets in | `profiles/{uid}.role == 'admin'` | anyone you've invited |
| How they sign in | Google, or emailed link | Google, or emailed link |
| What they see | every lead, client, invoice, project | only their own workspace |
| Enforced by | `firestore.rules` | the same file |

Both doors sit behind one sign-in page at `/login`, which works out where to
send someone after they authenticate. Your client never sees the admin exists.

---

## Step 0 — Revoke the key you shared

The Admin SDK service-account JSON that was sent over chat grants full control
of the project and bypasses every rule below. Nothing in this app uses it.

1. [Service accounts → `firebase-adminsdk-fbsvc@…`](https://console.cloud.google.com/iam-admin/serviceaccounts?project=brandmintstudios-a5eb7)
2. **Keys** tab → delete key `20f2839b7b297eb54d8ea49f61cb740ccd871586`

**Never put a service-account key in this repo.** Every file here is served to
the browser, so it would be published on your Vercel URL the moment you deploy.

---

## Step 1 — Register a web app and paste its config

1. [Firebase Console](https://console.firebase.google.com/project/brandmintstudios-a5eb7/settings/general)
   → ⚙️ **Project settings** → **General**
2. Scroll to **Your apps**. If there's no web app, click the **`</>`** icon and
   register one. Call it "Brand Mint site". **Do not** tick Firebase Hosting —
   you're staying on Vercel.
3. Under **SDK setup and configuration**, choose **Config**. You'll see:

   ```js
   const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "brandmintstudios-a5eb7.firebaseapp.com",
     projectId: "brandmintstudios-a5eb7",
     storageBucket: "brandmintstudios-a5eb7.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123",
   };
   ```

4. Copy **`apiKey`**, **`messagingSenderId`** and **`appId`** into
   **`firebase/config.js`**, replacing the three `PASTE_…_HERE` values.
   Check `storageBucket` matches too — older projects use `…appspot.com` and
   the two names are not interchangeable.

> **This config is not a secret.** `apiKey` identifies the project; it
> authorises nothing. Google publishes it in every Firebase web app. The
> security boundary is `firestore.rules`, which you're about to deploy.

---

## Step 2 — Create the database

1. **Build → Firestore Database → Create database**
2. **Native mode** (not Datastore)
3. Location: **`asia-south1` (Mumbai)** — closest to Hyderabad.
   **This cannot be changed later**, so get it right now.
4. Start in **production mode** (locked). You're replacing the rules in the
   next step anyway, and a few minutes in test mode is a few minutes with an
   open database.

---

## Step 3 — Deploy the security rules

**This is the step that matters.** Without it, either nothing works (locked
mode) or everything is public (test mode).

1. **Firestore Database → Rules** tab
2. Delete what's there, paste the entire contents of **`firestore.rules`**
3. **Publish**

No CLI needed — same idea as pasting SQL into a database console.

What it enforces, so you know what you're publishing:

- An admin sees everything; a client sees only documents carrying their
  `clientId`; a signed-out visitor sees nothing at all.
- A client **cannot** change their own role to admin.
- A client approving a deliverable **cannot** also rename it, re-point its
  URL, or bump its version — only the five review fields can change.
- A client **cannot** post a message stamped as coming from the agency, or
  rewrite one of yours.
- Draft deliverables are invisible to clients until you send them.
- The public contact form can create a `leads` document and nothing else —
  the shape and field sizes are pinned so it can't be used as free storage.
- Anything not explicitly matched is denied.

---

## Step 4 — Turn on the sign-in methods

**Authentication → Get started → Sign-in method**

- **Google** → Enable. Set the support email. Save.
  Firebase provisions the OAuth client for you — no Google Cloud Console trip.
- **Email/Password** → Enable, and inside it enable **Email link (passwordless
  sign-in)**. Leave "Password" itself off if you like; the app only uses links.

Then **Authentication → Settings → Authorized domains**, add:

```
brand-mint-sdmk.vercel.app
localhost
```

Add your custom domain here too once `brandmint.studio` is pointed, or
sign-in will fail on it with `auth/unauthorized-domain`.

---

## Step 5 — Make yourself the admin

You can't grant yourself admin from inside the app — the rules pin every new
profile to `role: 'client'`. That's the point. Do it once by hand.

1. Go to `https://brand-mint-sdmk.vercel.app/login` and sign in with Google.
   You'll land on the portal saying no workspace is linked — correct, you're
   not a client.
2. **Firestore Database → Data** → open the **`profiles`** collection → find
   the document whose `email` is yours.
3. Change **`role`** from `client` to `admin`. Save.
4. Reload `/admin`. You're in.

Repeat for any teammate who should have full access.

---

## Step 6 — How a client comes in

There is no form and no invite. This is the flow every client goes through:

1. **They pick a store on the home page** and hit *Choose*. That opens
   `/login?tier=…` with the tier shown.
2. **They sign in with Google.** By pressing the button they accept the
   Privacy Policy and Terms (stated right under it); the newsletter is an
   optional tick. Their profile gets `consent` and `selectedTier`, and a
   **lead** is created with their `uid`, email and tier.
3. **You see it the same minute** — dashboard "Needs you" and the Leads page,
   with the tier and price. Their portal shows "we'll call you within a day."
4. **You call them.** Then in Leads, hit **Convert to client**. That creates
   the client record, links their Google login to the portal (no invite —
   their `uid` is already on the lead), and opens Delivery.
5. **In Delivery**, add the agreement as a deliverable of kind *Document to
   sign* and hit *Send to client*; raise the 50% deposit invoice under
   Invoices. Their portal now shows the onboarding checklist with both.
6. **When they've signed**, mark *Agreement signed*. **When the deposit
   lands**, mark *50% deposit received* — that flips them to **active** and
   their portal becomes the live timeline: milestones, files to approve,
   invoices, messages.

The old invite path (Onboarding → *Invite client*) still works for someone
you want to add by hand without them picking a tier first.

---

## Checking it actually locked

Worth five minutes, once.

1. Open `/admin` in a **private window**. You should be bounced to `/login`.
2. In that window, run in devtools:
   ```js
   localStorage.setItem("bm.auth.profile.v1",
     JSON.stringify({ id: "x", email: "x@x.com", role: "admin" }));
   ```
   Reload `/admin`. The shell may flash, but you must end up back at `/login`
   — and even if it didn't, every query would come back empty. That's the
   rules doing their job, and it's why the client-side check is only a
   convenience.
3. Sign in as a test client and confirm the portal shows only their rows.

---

## Things worth knowing

**Demo data is no longer seeded automatically.** On Supabase it wrote sample
clients on first boot; against a real project that would be pollution. If you
want the sample set to look around, open the admin console and run `bm.seed()`.

**Nothing is emailed automatically.** Invites are a copy-paste message. If you
want real invite emails later, that's a Cloud Function plus a mail provider —
and it's the one thing that would need the Blaze (pay-as-you-go) plan. As
built, the app runs entirely on the free Spark plan.

**Deliverable files are links, not uploads.** Paste a Drive, Figma or
WeTransfer URL. Firebase Storage is wired into the config and is the natural
next step when you want files in one place.

**One person, several clients.** `clientUsers` is a join collection, so the
same email can belong to more than one client. The portal shows the first; a
workspace switcher is a small addition when you need it.

**Invite document IDs are `{email}_{clientId}` and must stay that way.** The
rules prove an invite exists with a single lookup on that exact path. The
admin app builds it for you — just don't hand-create invites in the console
with random IDs.

**The SDK version is pinned** to `10.13.0` in `firebase/config.js`
(`FIREBASE_SDK_VERSION`). I could not reach gstatic from the build sandbox to
confirm that exact version serves, so if the first load fails with
"Failed to fetch dynamically imported module", bump that one constant to a
current version from
<https://firebase.google.com/docs/web/setup#available-libraries> and reload.

**Rotating the API key** isn't a security action — it's public. If you ever
need to change it, it's in one file: `firebase/config.js`.

**The old Supabase project is now unused.** Nothing points at
`ycdfgtljxqrhyobnwwbz` any more. Delete it when you're satisfied this works,
so there isn't a second copy of your data sitting somewhere unwatched.
