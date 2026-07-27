/**
 * Operational runbooks — the procedures that are not a sellable service but
 * are needed to run the studio.
 *
 * These exist because "how do I get the UID?" was asked, answered in a chat
 * message, and then lost. A procedure that lives only in someone's memory gets
 * re-derived every time, slightly differently, until one of the derivations is
 * wrong. Anything done more than once belongs here.
 *
 * Same shape as the service runbooks so one renderer handles both.
 */

export const OPS_RUNBOOKS = {
  "ops-client-login": {
    label: "Create a client login",
    category: "ops",
    summary:
      "Two steps in two places: Firebase Console makes the account and generates a UID, the Client Access panel on /studio turns that UID into a users document. Skip the second and the client signs in to a completely empty portal.",
    prerequisites: [
      "The organisation already exists in /studio. Create it first — the panel asks you to pick one.",
      "You are signed in as admin@brandmintstudios.in.",
      "You have decided the username. Keep it short and obvious: the business name, lowercased, no spaces.",
    ],
    fromClient: [
      "Nothing. You create the login and hand it over — the client never types a password into anything of ours.",
    ],
    steps: [
      {
        do: "Open the Firebase Console and pick the brandmintstudios-a5eb7 project",
        where: "Firebase Console",
        detail: "console.firebase.google.com",
      },
      {
        do: "Go to Authentication, then the Users tab, then Add user",
        where: "Firebase Console",
      },
      {
        do: "Enter the email as username@brandmintstudios.in",
        where: "Firebase Console",
        detail:
          "greenbasket becomes greenbasket@brandmintstudios.in. The mapping is arithmetic, not a lookup table — lowercased and trimmed — so there is no list to keep in step.",
      },
      {
        do: "Set a password and record it in your password manager",
        where: "Firebase Console",
        detail:
          "This is the only place it will ever exist. Nothing in this codebase stores, hashes or compares a password, and no field anywhere accepts one.",
      },
      {
        do: "Copy the User UID from the new row",
        where: "Firebase Console",
        detail:
          "A 28-character string like kJ8nQ2mX4pRvT9wZaB3cD5eF7gH1. Hover the row for the copy icon. Copy it — do not retype it.",
      },
      {
        do: "On /studio, fill in Client Access: username, display name, organisation, and paste the UID",
        where: "repo",
        detail:
          "This writes users/{uid} with the orgId. That document is what the rules read.",
      },
      {
        do: "Send the client the username and password by a channel they already use",
        where: "client",
        detail: "Tell them to change nothing — there is no self-service password reset built.",
      },
    ],
    verify: [
      "Sign in as the client in a private window. You should see their organisation name, their project, and their invoices — not a blank page.",
      "Load /tenancy-check while signed in as them. It must say Isolated. As admin it correctly reports inconclusive, so this only means anything from a client session.",
      "In Firestore, confirm users/{uid} exists and its orgId matches the organisation you picked.",
    ],
    traps: [
      "Creating the Auth user and skipping the Client Access panel is the big one. They sign in fine and then see nothing at all — not an error, just an empty portal. The rules call get(/users/$(uid)) for both me() and myOrg(), so with no users document every read is denied.",
      "A mistyped UID creates a document for a user who does not exist. The real client still sees nothing, and the panel cannot tell you — it has no way to check a UID exists. Always paste.",
      "The sign-in host must be in Firebase authorized domains or auth fails with auth/unauthorized-domain. www.brandmintstudios.in is there; a new Vercel preview alias is not until you add it.",
      "Deleting the Auth user does not delete users/{uid}. Remove both, or the orphan document stays readable by whoever next gets that UID — which will not happen, but the row is still wrong.",
    ],
    handover: [
      "The client signs in at /login with a username, not an email address.",
      "They see their project status, what is blocking it, anything awaiting their approval, preview links, and their invoices.",
      "They can tick intake items and approve deliverables. Those are the only two writes they are permitted anywhere in the system.",
    ],
  },

  "ops-publish-rules": {
    label: "Publish firestore.rules",
    category: "ops",
    summary:
      "firestore.rules in this repo is a file until you paste it into the Firebase Console. Editing it and pushing changes nothing — production keeps running whatever was last published there.",
    prerequisites: [
      "The rules tests pass against the emulator. Never publish a rules change you have not run.",
      "You know what the change actually permits. If a change seems to be needed for an admin feature, stop — everything the admin UI does is already covered by isAdmin(), so needing a rules change usually means the feature is not really admin-only.",
    ],
    fromClient: ["Nothing. This is a studio operation."],
    steps: [
      {
        do: "Run the rules tests locally first",
        where: "local",
        detail:
          "npx firebase emulators:exec --only firestore --project demo-bm \"node --test tests/rules.test.mjs\" — needs Java, no credentials, touches nothing live.",
      },
      {
        do: "Open Firebase Console, Firestore Database, then the Rules tab",
        where: "Firebase Console",
      },
      {
        do: "Replace the entire contents with firestore.rules from the repo",
        where: "Firebase Console",
        detail: "Whole file, not a patch. A partially-pasted ruleset is a hole.",
      },
      {
        do: "Press Publish and wait for it to confirm",
        where: "Firebase Console",
        detail: "Publishing is immediate and applies to live traffic. There is no staging.",
      },
      {
        do: "Re-run the anonymous probe against production",
        where: "local",
        detail:
          "Confirms a signed-out visitor is still denied every read and write. A rules edit that accidentally opens a collection is silent otherwise.",
      },
    ],
    verify: [
      "The Rules tab shows the same text as the repo file and a fresh publish timestamp.",
      "Signed out, loading /portal shows nothing and the console shows permission-denied rather than data.",
      "A client session loading /tenancy-check still reports Isolated.",
    ],
    traps: [
      "The most common mistake by far: editing firestore.rules in the repo, pushing, and assuming it took effect. The file in git and the rules in the Console are two separate things and nothing syncs them.",
      "The admin is identified by the email claim on the token, not by a users document with role admin. An earlier version checked the document and deadlocked — you could not write the first admin document without already being admin. Do not reintroduce that.",
      "The admin email is hardcoded in firestore.rules. It has to change in two places when it changes: there, and ADMIN_EMAIL in assets/bm-app.js.",
    ],
    handover: ["Nothing client-facing. This is the security boundary, not a feature."],
  },

  "ops-promote-production": {
    label: "Put a change live",
    category: "ops",
    summary:
      "A push to the production branch creates a Vercel preview. It does not go live. Production is promoted by hand, deliberately, so a bad push cannot take the site down on its own.",
    prerequisites: [
      "The change is committed and pushed to claude/new-session-glceza.",
      "You have opened the preview URL and actually clicked the thing you changed.",
    ],
    fromClient: ["Nothing."],
    steps: [
      {
        do: "Push to claude/new-session-glceza",
        where: "local",
        detail: "git push -u origin claude/new-session-glceza",
      },
      {
        do: "Open the Vercel dashboard for brand-mint-sdmk and find the new deployment",
        where: "Vercel",
        detail: "Team sumanthrb94-3803s-projects.",
      },
      {
        do: "Open the preview URL and test the change end to end",
        where: "Vercel",
        detail:
          "Sign in if the change touches an authenticated page. If the preview host is not in Firebase authorized domains, sign-in fails there and you will need to add it.",
      },
      {
        do: "Press Promote to Production",
        where: "Vercel",
      },
      {
        do: "Load www.brandmintstudios.in and confirm the change is there",
        where: "Vercel",
        detail: "www actually serves; the apex redirects to it.",
      },
    ],
    verify: [
      "The production deployment in Vercel shows the commit you just pushed.",
      "A hard refresh of the live site shows the change.",
      "The marketing site at / still loads and is unaffected.",
    ],
    traps: [
      "Assuming a push went live. It never does. This has caused more confusion than any other single thing in this project.",
      "Vercel deployment limits are per-day. Hitting them blocks promotion for up to 24 hours, so do not leave promotion to the last moment before a client call.",
      "cleanUrls is on, so login.html serves at /login. Linking to a path with .html on it will 404.",
    ],
    handover: ["The client sees the change on the live site."],
  },

  "ops-tenancy-check": {
    label: "Prove tenant isolation",
    category: "ops",
    summary:
      "Confirms one client cannot read another's data by editing a URL. It only proves anything from a client session — run as admin it correctly reports inconclusive, because the admin is allowed to read everything.",
    prerequisites: [
      "At least two organisations exist, each with data.",
      "A client login exists for one of them — see the Create a client login runbook.",
    ],
    fromClient: ["Nothing."],
    steps: [
      { do: "Sign out of the admin account completely", where: "repo" },
      { do: "Sign in as the client at /login", where: "repo" },
      { do: "Load /tenancy-check", where: "repo" },
      {
        do: "Read the result",
        where: "repo",
        detail:
          "It attempts to read a foreign tenant's documents. A denied read is the PASS condition, so it renders green — the colour follows whether the result is correct, not whether the request succeeded.",
      },
    ],
    verify: [
      "The page reports Isolated.",
      "Every foreign read is shown as denied, in green.",
      "Running the same page as admin says inconclusive rather than passed. If it claims a pass as admin, the page is broken.",
    ],
    traps: [
      "Running it as admin and treating inconclusive as a pass. That is the whole reason this runbook exists.",
      "A green tick next to a denied read looks wrong at a glance and is right. Colour follows correctness here, not HTTP status.",
    ],
    handover: [
      "Evidence you can show a prospective client: isolation is proven from a real session, not asserted in a proposal.",
    ],
  },

  "ops-add-client": {
    label: "Onboard a new client end to end",
    category: "ops",
    summary:
      "The full sequence from signed contract to a client who can see their own project: organisation, project, milestones, intake list, login, handover.",
    prerequisites: [
      "The scope is agreed and the price has passed the margin gate on /quote. If it says BELOW FLOOR, do not sign.",
      "You have a start date from the client. Milestone templates supply the shape; the date is never invented.",
    ],
    fromClient: [
      "A start date.",
      "The named person who will actually answer questions — not a group address.",
      "Access requests get sent as delegation: they add hello@brandmintstudios.in as a user on their own accounts. Never ask them to send a password or key.",
    ],
    steps: [
      {
        do: "Create the organisation on /studio with kind client and the agreed retainer",
        where: "repo",
        detail:
          "retainerStatus is signed only when it is actually signed. Proposed is not revenue and is never counted as MRR.",
      },
      {
        do: "Create the project, set its type from the service catalogue, and set the due date",
        where: "repo",
        detail:
          "Leave progress null until there is something real to record. Zero draws an empty bar that reads as started-and-stalled.",
      },
      {
        do: "Apply the milestone template for that project type, then set the dates from the client's start date",
        where: "repo",
      },
      {
        do: "Add every intake item you need from them, each with a raisedAt date",
        where: "repo",
        detail:
          "The age of a blocker is what makes it move. Dated and oldest-first is the entire reason the portal exists.",
      },
      {
        do: "Create the client login",
        where: "Firebase Console",
        detail: "Follow the Create a client login runbook. Both halves, or they see an empty portal.",
      },
      {
        do: "Sign in as them and check the portal looks right before you send anything",
        where: "repo",
      },
      {
        do: "Send the login and a two-line explanation of what the portal is for",
        where: "client",
        detail:
          "Say plainly that anything in What we need from you is holding the project. That sentence is what makes the portal do its job without you chasing.",
      },
    ],
    verify: [
      "Signed in as the client: their org name, their project, their milestones, their intake list, their invoices. Nothing belonging to anyone else.",
      "/tenancy-check from that session reports Isolated.",
      "On /studio the new organisation appears with the right retainer status, and MRR moved only if the retainer is signed.",
    ],
    traps: [
      "Counting a proposed retainer as MRR. A dashboard that flatters is worse than none.",
      "An empty intake list rendering as though nothing is needed. If you have not raised the blockers, the portal will not chase them.",
      "Setting billable true on an archived organisation. It skews delivery health and the numbers stop meaning anything.",
    ],
    handover: [
      "The client can see where their project is, what is waiting on them and for how long, what needs their approval, and what they owe.",
      "You stop sending status updates. The portal is the status update.",
    ],
  },

  "ops-payments-setup": {
    label: "Switch on invoice payments",
    category: "ops",
    summary:
      "Two environment variables in Vercel and clients can pay an invoice from /portal. With neither set, every endpoint returns 503 and the Pay button says payment is not switched on — nothing breaks.",
    prerequisites: [
      "A Razorpay account in Brand Mint's own name. This collects the studio's fees only — a client store's customers must pay into that client's own account.",
      "Test keys generated first. Live keys go in only after a full end-to-end test.",
    ],
    fromClient: ["Nothing. This is the studio's own merchant account."],
    steps: [
      {
        do: "In the Razorpay dashboard, generate API keys",
        where: "Razorpay",
        detail: "Settings, then API Keys, then Generate Key. Start with Test mode.",
      },
      {
        do: "Put the key id and secret into Vercel as environment variables",
        where: "Vercel",
        detail:
          "Settings, Environment Variables. RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. The secret is server-only — never in the repo, never in a client-side file, never pasted into a chat.",
      },
      { do: "Redeploy so the functions pick up the new variables", where: "Vercel" },
      {
        do: "Sign in as a test client and pay a small invoice with a test card",
        where: "repo",
      },
      {
        do: "On /studio press Sync payments and confirm the invoice flips to paid",
        where: "repo",
      },
      {
        do: "Swap in live keys only once the test flow has worked end to end",
        where: "Vercel",
      },
    ],
    verify: [
      "A test payment appears in the Razorpay dashboard with the invoice id in its notes.",
      "Sync payments reports it and the invoice status becomes paid.",
      "With the variables removed, the Pay button reports that payment is not switched on rather than erroring.",
    ],
    traps: [
      "Putting the key secret anywhere the browser can see it. The key id is public by design; the secret signs the check that says money arrived.",
      "Going straight to live keys. Test with rzp_test first — a broken live flow means real money in a wrong state.",
      "Expecting the invoice to flip to paid by itself. There is no webhook and no privileged writer: the admin's own browser does the write when you press Sync payments. The client is told this on the confirmation screen.",
      "Routing a client store's customer payments through this account. That is payment aggregation and needs an RBI licence in India.",
    ],
    handover: [
      "Clients pay invoices by UPI, card or netbanking from the portal instead of asking for bank details.",
      "You reconcile with one button rather than reading bank statements.",
    ],
  },
};

export default OPS_RUNBOOKS;
