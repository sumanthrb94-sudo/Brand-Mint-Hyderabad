/**
 * firestore.rules — security tests against the Firestore emulator.
 *
 * These prove the thing that matters most and that no amount of clicking
 * around production can prove safely: that a signed-in client is confined to
 * their own tenant, and that the two writes they are allowed cannot be used to
 * smuggle in a third.
 *
 * Deterministic, needs no credentials, touches no live data, and runs offline.
 *
 *   cd /tmp && npm i @firebase/rules-unit-testing firebase firebase-tools && cd -
 *   NODE_PATH=/tmp/node_modules npx firebase emulators:exec \
 *     --only firestore --project demo-bm \
 *     "NODE_PATH=/tmp/node_modules node --test tests/rules.test.mjs"
 *
 * Dependencies install OUTSIDE this repo. There is no package.json here and
 * there must not be one — see CLAUDE.md section 3.
 */

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where,
  serverTimestamp,
} from "firebase/firestore";

const ADMIN_EMAIL = "admin@brandmintstudios.in";
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-bm",
    firestore: {
      rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => { await env?.cleanup(); });

// Seed with rules disabled, then exercise the rules as each persona.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/admin-uid"), { orgId: "brandmint", role: "admin", name: "Admin", username: "admin" });
    await setDoc(doc(db, "users/gb-uid"), { orgId: "greenbasket", role: "client", name: "Green Basket", username: "greenbasket" });
    await setDoc(doc(db, "users/inv-uid"), { orgId: "inventory", role: "client", name: "Inventory", username: "inventory" });

    await setDoc(doc(db, "organisations/greenbasket"), { name: "Green Basket", kind: "client", status: "active", retainer: 0, retainerStatus: "none" });
    await setDoc(doc(db, "organisations/inventory"), { name: "Inventory Manager", kind: "client", status: "active", retainer: 12500, retainerStatus: "signed" });

    await setDoc(doc(db, "projects/gb-project"), { orgId: "greenbasket", name: "Green Basket", billable: true });
    await setDoc(doc(db, "projects/inv-project"), { orgId: "inventory", name: "Inventory Manager", billable: true });

    await setDoc(doc(db, "projects/gb-project/intake/i1"), { label: "Play Store access", group: "access", done: false, raisedAt: new Date(), clearedAt: null });
    await setDoc(doc(db, "projects/inv-project/intake/i1"), { label: "Supplier list", group: "assets", done: false, raisedAt: new Date(), clearedAt: null });
    await setDoc(doc(db, "projects/gb-project/deliverables/d1"), { title: "COD web app", version: 1, status: "in_review", url: null });
    await setDoc(doc(db, "projects/gb-project/milestones/m1"), { title: "Launch", owner: "us", status: "todo", dueAt: new Date() });
    await setDoc(doc(db, "projects/gb-project/scope/checkout"), { featureId: "checkout", label: "Checkout", amount: 40000, days: 4, status: "agreed", order: 0 });
    await setDoc(doc(db, "projects/inv-project/scope/stock"), { featureId: "stock", label: "Stock counts", amount: 25000, days: 3, status: "agreed", order: 0 });

    await setDoc(doc(db, "invoices/gb-1"), { orgId: "greenbasket", label: "Balance", amount: 80000, status: "due" });
    await setDoc(doc(db, "invoices/inv-1"), { orgId: "inventory", label: "Retainer", amount: 12500, status: "paid" });
    await setDoc(doc(db, "leads/l1"), { name: "A lead", source: "site", stage: "inbound" });
    await setDoc(doc(db, "catalog/payments-razorpay"), { price: 40000, priceType: "fixed", buildDays: 4 });

    /* THE FIVE ROLES (spec §3). Partner and Collaborator are assigned to
       gb-project only, so every "assigned vs not" assertion below has a real
       negative case rather than a hypothetical one. */
    await setDoc(doc(db, "users/partner-uid"), { orgId: "brandmint", role: "partner", name: "Partner" });
    await setDoc(doc(db, "users/collab-uid"), { orgId: "brandmint", role: "collaborator", name: "Collaborator" });
    await setDoc(doc(db, "users/finance-uid"), { orgId: "brandmint", role: "finance", name: "Finance" });
    await updateDoc(doc(db, "projects/gb-project"), { team: ["partner-uid", "collab-uid"] });

    /* Rates in their own collection — the field-level matrix rule Firestore
       cannot express on a shared document. */
    await setDoc(doc(db, "rates/collab-uid"), { rate: 6000, currency: "INR" });
    await setDoc(doc(db, "rates/partner-uid"), { rate: 12000, currency: "INR" });
  });
});

const admin = () => env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL }).firestore();
const client = () => env.authenticatedContext("gb-uid", { email: "greenbasket@brandmintstudios.in" }).firestore();
const other = () => env.authenticatedContext("inv-uid", { email: "inventory@brandmintstudios.in" }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const partner = () => env.authenticatedContext("partner-uid", { email: "partner@brandmintstudios.in" }).firestore();
const collab = () => env.authenticatedContext("collab-uid", { email: "collab@brandmintstudios.in" }).firestore();
const finance = () => env.authenticatedContext("finance-uid", { email: "finance@brandmintstudios.in" }).firestore();

/* ─────────── anonymous is locked out entirely ─────────── */

test("anonymous cannot read anything", async () => {
  const db = anon();
  await assertFails(getDoc(doc(db, "organisations/greenbasket")));
  await assertFails(getDoc(doc(db, "projects/gb-project")));
  await assertFails(getDoc(doc(db, "invoices/gb-1")));
  await assertFails(getDoc(doc(db, "users/gb-uid")));
  await assertFails(getDocs(collection(db, "leads")));
  await assertFails(getDocs(collection(db, "catalog")));
});

test("anonymous cannot write anything", async () => {
  const db = anon();
  await assertFails(setDoc(doc(db, "users/attacker"), { orgId: "inventory", role: "admin" }));
  await assertFails(setDoc(doc(db, "organisations/greenbasket"), { name: "hacked" }));
  await assertFails(setDoc(doc(db, "catalog/x"), { price: 1 }));
});

/* ─────────── THE TENANCY TEST ─────────── */

test("a client reads their own org, project and invoice", async () => {
  const db = client();
  await assertSucceeds(getDoc(doc(db, "organisations/greenbasket")));
  await assertSucceeds(getDoc(doc(db, "projects/gb-project")));
  await assertSucceeds(getDocs(collection(db, "projects/gb-project/intake")));
  await assertSucceeds(getDocs(collection(db, "projects/gb-project/deliverables")));
  await assertSucceeds(getDocs(collection(db, "projects/gb-project/milestones")));
});

test("a client CANNOT read another tenant's org or project", async () => {
  const db = client();
  await assertFails(getDoc(doc(db, "organisations/inventory")));
  await assertFails(getDoc(doc(db, "projects/inv-project")));
  await assertFails(getDocs(collection(db, "projects/inv-project/intake")));
  await assertFails(getDoc(doc(db, "invoices/inv-1")));
});

test("editing the URL to another project id does not work", async () => {
  // The exact attack the portal must survive: a client swaps the project id.
  await assertFails(getDoc(doc(client(), "projects/inv-project")));
  await assertFails(getDoc(doc(other(), "projects/gb-project")));
});

test("a client cannot read another client's users document", async () => {
  await assertFails(getDoc(doc(client(), "users/inv-uid")));
  await assertSucceeds(getDoc(doc(client(), "users/gb-uid")));
});

test("a client cannot read leads or the price catalog", async () => {
  const db = client();
  await assertFails(getDocs(collection(db, "leads")));
  await assertFails(getDocs(collection(db, "catalog")));
});

/* ─────────── the two writes a client is allowed ─────────── */

test("a client may tick their own intake item", async () => {
  // serverTimestamp(), not new Date() — the rules pin the clock. See the
  // "fields a client IS allowed to touch" block at the end of this file.
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/intake/i1"), { done: true, clearedAt: serverTimestamp() })
  );
});

test("a client may approve or request changes on their own deliverable", async () => {
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: serverTimestamp(), decidedBy: "gb-uid",
    })
  );
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "changes_requested", decidedAt: serverTimestamp(), decidedBy: "gb-uid",
    })
  );
});

/* ─────────── onlyTouches: the tick cannot smuggle ─────────── */

test("a tick cannot smuggle in another field", async () => {
  // This is what onlyTouches() exists for.
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/intake/i1"), { done: true, label: "rewritten by the client" })
  );
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/intake/i1"), { done: true, clearedAt: serverTimestamp(), raisedAt: new Date(2020, 0, 1) })
  );
});

test("a client cannot set a deliverable to a status only we may set", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "in_review", decidedAt: serverTimestamp(), decidedBy: "gb-uid",
    })
  );
});

test("a client cannot rewrite a deliverable's title or url", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: serverTimestamp(), decidedBy: "gb-uid", url: "https://evil.example",
    })
  );
});

test("a client cannot tick ANOTHER tenant's intake item", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/inv-project/intake/i1"), { done: true, clearedAt: serverTimestamp() })
  );
});

/* ─────────── privilege escalation ─────────── */

test("a client cannot promote themselves or move org", async () => {
  const db = client();
  await assertFails(setDoc(doc(db, "users/gb-uid"), { orgId: "inventory", role: "admin", name: "x", username: "x" }));
  await assertFails(updateDoc(doc(db, "users/gb-uid"), { role: "admin" }));
  await assertFails(updateDoc(doc(db, "users/gb-uid"), { orgId: "inventory" }));
});

test("a client cannot create projects, invoices, milestones or intake items", async () => {
  const db = client();
  await assertFails(setDoc(doc(db, "projects/invented"), { orgId: "greenbasket", name: "mine now" }));
  await assertFails(setDoc(doc(db, "invoices/invented"), { orgId: "greenbasket", amount: 0, status: "paid" }));
  await assertFails(setDoc(doc(db, "projects/gb-project/milestones/m2"), { title: "x", owner: "us", status: "done" }));
  await assertFails(setDoc(doc(db, "projects/gb-project/intake/i2"), { label: "x", group: "assets", done: true }));
});

test("a client cannot mark their own invoice paid", async () => {
  await assertFails(updateDoc(doc(client(), "invoices/gb-1"), { status: "paid" }));
});

test("a client cannot delete anything", async () => {
  const db = client();
  await assertFails(deleteDoc(doc(db, "projects/gb-project/intake/i1")));
  await assertFails(deleteDoc(doc(db, "projects/gb-project/deliverables/d1")));
  await assertFails(deleteDoc(doc(db, "projects/gb-project")));
});

/* ─────────── admin ─────────── */

test("admin reads every tenant", async () => {
  const db = admin();
  await assertSucceeds(getDoc(doc(db, "organisations/greenbasket")));
  await assertSucceeds(getDoc(doc(db, "organisations/inventory")));
  await assertSucceeds(getDoc(doc(db, "projects/inv-project")));
  await assertSucceeds(getDocs(collection(db, "leads")));
  await assertSucceeds(getDocs(collection(db, "catalog")));
});

test("admin writes what the studio UI needs", async () => {
  const db = admin();
  await assertSucceeds(setDoc(doc(db, "users/new-client-uid"), { orgId: "greenbasket", role: "client", name: "N", username: "n" }));
  await assertSucceeds(setDoc(doc(db, "catalog/chat-support"), { price: 30000, priceType: "fixed", buildDays: 3 }));
  await assertSucceeds(setDoc(doc(db, "projects/gb-project/milestones/m9"), { title: "New", owner: "us", status: "todo", dueAt: new Date() }));
  await assertSucceeds(setDoc(doc(db, "leads/l2"), { name: "New lead", source: "site", stage: "inbound" }));
  await assertSucceeds(updateDoc(doc(db, "invoices/gb-1"), { status: "paid" }));
});

test("admin identity comes from the token, not a users document", async () => {
  // Someone whose users doc claims role:'admin' but whose token email is not
  // the admin address must NOT be treated as admin.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users/liar-uid"), { orgId: "greenbasket", role: "admin", name: "Liar", username: "liar" });
  });
  const liar = env.authenticatedContext("liar-uid", { email: "liar@brandmintstudios.in" }).firestore();
  await assertFails(getDoc(doc(liar, "organisations/inventory")));
  await assertFails(getDocs(collection(liar, "leads")));
  await assertFails(setDoc(doc(liar, "users/anyone"), { orgId: "x", role: "admin" }));
});

/* ─────────── the load-bearing users document ─────────── */

test("a signed-in user with no users document can read nothing", async () => {
  // Documents the failure mode the onboarding doc warns about: skip the
  // Client Access step and the client sees an empty portal, not an error.
  const ghost = env.authenticatedContext("ghost-uid", { email: "ghost@brandmintstudios.in" }).firestore();
  await assertFails(getDoc(doc(ghost, "organisations/greenbasket")));
  await assertFails(getDoc(doc(ghost, "projects/gb-project")));
  await assertFails(getDoc(doc(ghost, "invoices/gb-1")));
});


/* ── listing, not just reading one document ────────────────────
   The portal's core query is "give me my projects", a LIST. Every test above
   reads a single document, and a rule can permit get while denying list —
   which is exactly what happened: `mine(pid)` calls get(/projects/$(pid)),
   and on a list the wildcard is unbound, so it resolved to /projects/null and
   failed with "Null value error". Clients could never list their projects and
   nothing here noticed. */

test("a client can LIST their own projects, not only read one", async () => {
  await assertSucceeds(
    getDocs(query(collection(client(), "projects"), where("orgId", "==", "greenbasket")))
  );
});

test("a client cannot list ALL projects", async () => {
  await assertFails(getDocs(collection(client(), "projects")));
});

test("a client cannot list another org's projects", async () => {
  await assertFails(
    getDocs(query(collection(client(), "projects"), where("orgId", "==", "tresor")))
  );
});

test("a client can LIST their own invoices", async () => {
  await assertSucceeds(
    getDocs(query(collection(client(), "invoices"), where("orgId", "==", "greenbasket")))
  );
});

test("a client cannot list another org's invoices", async () => {
  await assertFails(
    getDocs(query(collection(client(), "invoices"), where("orgId", "==", "tresor")))
  );
});

test("an admin can list every project", async () => {
  await assertSucceeds(getDocs(collection(admin(), "projects")));
});

/* ── agreed scope ──────────────────────────────────────────────
   The scope is the client's copy of what they bought, so they must be able to
   read it. They must NOT be able to write it: delivery status is the studio's
   assertion about its own work, and a client who could mark a line "accepted"
   could equally mark a delivered one "agreed" and reopen a finished job. */

test("a client can read their own scope, single doc and list", async () => {
  await assertSucceeds(getDoc(doc(client(), "projects/gb-project/scope/checkout")));
  await assertSucceeds(getDocs(collection(client(), "projects/gb-project/scope")));
});

test("a client cannot read another org's scope", async () => {
  await assertFails(getDoc(doc(other(), "projects/gb-project/scope/checkout")));
  await assertFails(getDocs(collection(other(), "projects/gb-project/scope")));
});

test("a client cannot move their own scope line along", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/scope/checkout"), { status: "accepted" })
  );
});

test("a client cannot add or delete a scope line", async () => {
  await assertFails(
    setDoc(doc(client(), "projects/gb-project/scope/extra"), {
      featureId: "extra", label: "Free extra", amount: 0, days: 1, status: "agreed", order: 9,
    })
  );
  await assertFails(deleteDoc(doc(client(), "projects/gb-project/scope/checkout")));
});

test("anonymous cannot read a scope", async () => {
  await assertFails(getDoc(doc(anon(), "projects/gb-project/scope/checkout")));
});

test("an admin can create, move and delete scope lines on any project", async () => {
  const db = admin();
  await assertSucceeds(
    setDoc(doc(db, "projects/inv-project/scope/reports"), {
      featureId: "reports", label: "Reports", amount: 15000, days: 2, status: "agreed", order: 1,
    })
  );
  await assertSucceeds(
    updateDoc(doc(db, "projects/inv-project/scope/stock"), { status: "delivered" })
  );
  await assertSucceeds(deleteDoc(doc(db, "projects/inv-project/scope/reports")));
});

/* ── the fields a client IS allowed to touch ───────────────────
   `onlyTouches` stops a tick smuggling in a field change. It does not stop the
   client writing anything they like INTO the permitted fields, and for a while
   it did not: a client could approve a deliverable and record the ADMIN's uid
   as the approver, dated six years ago. Proven against the emulator before it
   was fixed, which is why these exist.

   This is not a leak. It is worse for what this product is: the portal's whole
   claim is that it says who is holding something up and since when. A record
   the interested party can forge answers nothing. */

test("a client's tick must carry the SERVER's clock, not one they chose", async () => {
  const db = client();
  await assertFails(
    updateDoc(doc(db, "projects/gb-project/intake/i1"), { done: true, clearedAt: new Date("2019-01-01") })
  );
  await assertSucceeds(
    updateDoc(doc(db, "projects/gb-project/intake/i1"), { done: true, clearedAt: serverTimestamp() })
  );
  // Un-ticking clears the date rather than stamping one.
  await assertSucceeds(
    updateDoc(doc(db, "projects/gb-project/intake/i1"), { done: false, clearedAt: null })
  );
});

test("a client cannot attribute their own approval to somebody else", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: serverTimestamp(), decidedBy: "admin-uid",
    })
  );
});

test("a client cannot backdate an approval", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: new Date("2019-06-01"), decidedBy: "gb-uid",
    })
  );
});

test("the honest decision — own uid, server clock — still works", async () => {
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: serverTimestamp(), decidedBy: "gb-uid",
    })
  );
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "changes_requested", decidedAt: serverTimestamp(), decidedBy: "gb-uid",
    })
  );
});

test("the admin is not held to the client's pins — they may correct a record", async () => {
  await assertSucceeds(
    updateDoc(doc(admin(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: new Date("2026-01-01"), decidedBy: "gb-uid",
    })
  );
});

/* ── the audit log (§9 item 4) ─────────────────────────────────────
   The claim this collection makes is not "the admin can write it" — that is
   true of nearly everything here. The claim is that NOBODY can rewrite it
   afterwards, and that an entry cannot lie about who did it or when.

   Those are the only properties that make a log worth reading, so those are
   what is proven. The pins are the same ones the intake/deliverable rules
   needed, for the same reason: `onlyTouches` constrains which fields may
   change, never what goes into them — and a create has no prior document to
   diff against at all, so pinning the values is the only control there is. */

const goodEntry = (over = {}) => ({
  at: serverTimestamp(),
  actor: "admin-uid",
  actorEmail: ADMIN_EMAIL,
  action: "invoice.paid",
  summary: "Marked paid by hand: 50% advance — Rs 80,000",
  orgId: "greenbasket",
  target: "50% advance",
  amount: 80000,
  ...over,
});

test("activity: the admin may append an honest entry", async () => {
  await assertSucceeds(setDoc(doc(admin(), "activity/e1"), goodEntry()));
});

test("activity: NOBODY may edit an entry — not even the admin who wrote it", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "activity/e1"), goodEntry());
  });
  // This is the whole point of the collection. If this ever passes, the log is
  // decorative: the one actor who can change business data could also change
  // the record of having changed it.
  await assertFails(updateDoc(doc(admin(), "activity/e1"), { summary: "nothing happened" }));
  await assertFails(deleteDoc(doc(admin(), "activity/e1")));
});

test("activity: an entry cannot be backdated", async () => {
  // serverTimestamp() is the only thing that satisfies `at == request.time`,
  // so a chosen date — the natural way to forge a timeline — is refused.
  await assertFails(setDoc(doc(admin(), "activity/e2"), goodEntry({ at: new Date("2019-06-01") })));
  await assertFails(setDoc(doc(admin(), "activity/e3"), goodEntry({ at: null })));
});

test("activity: an entry cannot be attributed to someone else", async () => {
  await assertFails(setDoc(doc(admin(), "activity/e4"), goodEntry({ actor: "gb-uid" })));
  await assertFails(setDoc(doc(admin(), "activity/e5"), goodEntry({ actorEmail: "greenbasket@brandmintstudios.in" })));
});

test("activity: the required fields really are required", async () => {
  await assertFails(setDoc(doc(admin(), "activity/e6"), goodEntry({ action: "" })));
  await assertFails(setDoc(doc(admin(), "activity/e7"), goodEntry({ action: 42 })));
  await assertFails(setDoc(doc(admin(), "activity/e8"), goodEntry({ summary: 42 })));
  // Capped so a runaway loop cannot write a megabyte per click.
  await assertFails(setDoc(doc(admin(), "activity/e9"), goodEntry({ summary: "x".repeat(301) })));
  await assertFails(setDoc(doc(admin(), "activity/e10"), goodEntry({ action: "x".repeat(65) })));
});

test("activity: a client can neither read nor write it", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "activity/e1"), goodEntry());
  });
  await assertFails(getDoc(doc(client(), "activity/e1")));
  await assertFails(getDocs(collection(client(), "activity")));
  await assertFails(setDoc(doc(client(), "activity/forged"), goodEntry({ actor: "gb-uid", actorEmail: "greenbasket@brandmintstudios.in" })));
});

test("activity: a signed-out visitor gets nothing", async () => {
  await assertFails(getDocs(collection(anon(), "activity")));
  await assertFails(setDoc(doc(anon(), "activity/x"), goodEntry()));
});

test("activity: the admin may read the log", async () => {
  await assertSucceeds(getDocs(collection(admin(), "activity")));
});

/* ═══════════════════════════════════════════════════════════════════
   THE FIVE-ROLE MATRIX (spec §3)

   SEC-10 asks for "an authorisation test suite covering every cell of the
   Section 3 matrix". These are the cells the CEO/Guest tests above do not
   reach, and the emphasis is deliberately on the DENIALS: a role that can see
   too little is an inconvenience, a role that can see too much is the breach
   SEC-02 names as the realistic failure mode for a system this shape.
   ═══════════════════════════════════════════════════════════════════ */

/* ─────────── collaborator rates ─────────── */

test("a collaborator reads their OWN rate and nobody else's", async () => {
  const db = collab();
  await assertSucceeds(getDoc(doc(db, "rates/collab-uid")));
  await assertFails(getDoc(doc(db, "rates/partner-uid")));
});

test("A PARTNER CANNOT READ ANY RATE — not their team's, not their own", async () => {
  // The matrix says "Collaborator rates: Partner —", and this is the cell that
  // makes the separate collection necessary at all: a partner who could read
  // the rate sheet could price a competitor's bid with it.
  const db = partner();
  await assertFails(getDoc(doc(db, "rates/collab-uid")));
  await assertFails(getDoc(doc(db, "rates/partner-uid")));
});

test("Finance reads every rate; the CEO writes them and nobody else does", async () => {
  await assertSucceeds(getDoc(doc(finance(), "rates/collab-uid")));
  await assertSucceeds(getDoc(doc(admin(), "rates/collab-uid")));
  await assertFails(setDoc(doc(finance(), "rates/collab-uid"), { rate: 1 }));
  await assertFails(setDoc(doc(collab(), "rates/collab-uid"), { rate: 999999 }));
  await assertSucceeds(setDoc(doc(admin(), "rates/collab-uid"), { rate: 7000 }));
});

test("a client can never read a rate", async () => {
  await assertFails(getDoc(doc(client(), "rates/collab-uid")));
});

/* ─────────── assignment scopes what staff can reach ─────────── */

test("an assigned partner reads their engagement; an unassigned one does not", async () => {
  const db = partner();
  await assertSucceeds(getDoc(doc(db, "projects/gb-project")));
  await assertFails(getDoc(doc(db, "projects/inv-project")));
});

test("an assigned collaborator reads tasks on that engagement only", async () => {
  const db = collab();
  await assertSucceeds(getDocs(collection(db, "projects/gb-project/milestones")));
  await assertFails(getDocs(collection(db, "projects/inv-project/milestones")));
});

test("A COLLABORATOR CANNOT READ SCOPE — it carries the line prices", async () => {
  // "Scope & change requests: Collaborator —". Scope is commercial data and
  // the matrix gives collaborators none of it, assigned or not.
  const db = collab();
  await assertFails(getDocs(collection(db, "projects/gb-project/scope")));
  await assertFails(getDoc(doc(db, "projects/gb-project/scope/checkout")));
});

test("a collaborator cannot read organisations or invoices at all", async () => {
  const db = collab();
  await assertFails(getDoc(doc(db, "organisations/greenbasket")));
  await assertFails(getDoc(doc(db, "invoices/gb-1")));
  await assertFails(getDocs(collection(db, "leads")));
});

test("a collaborator may move their assigned work along", async () => {
  await assertSucceeds(updateDoc(doc(collab(), "projects/gb-project/milestones/m1"), { status: "doing" }));
});

test("but cannot rewrite the engagement itself", async () => {
  await assertFails(updateDoc(doc(collab(), "projects/gb-project"), { name: "renamed" }));
});

/* ─────────── Finance ─────────── */

test("Finance has full write on invoices and nothing else", async () => {
  const db = finance();
  await assertSucceeds(getDoc(doc(db, "invoices/gb-1")));
  await assertSucceeds(updateDoc(doc(db, "invoices/gb-1"), { status: "paid" }));
  // Read-only on clients, no write.
  await assertSucceeds(getDoc(doc(db, "organisations/greenbasket")));
  await assertFails(updateDoc(doc(db, "organisations/greenbasket"), { retainer: 99999 }));
  // No deliverables, no scope — "Finance: no access to client deliverables".
  await assertFails(getDocs(collection(db, "projects/gb-project/scope")));
});

test("a partner cannot settle an invoice — that is Finance's cell", async () => {
  await assertFails(updateDoc(doc(partner(), "invoices/gb-1"), { status: "paid" }));
  await assertSucceeds(getDoc(doc(partner(), "invoices/gb-1")));
});

/* ─────────── the audit log ─────────── */

test("staff can APPEND to the audit log but only the CEO can read it", async () => {
  // Create had to widen to all staff: with five roles, leaving it CEO-only
  // would make the log silently incomplete the moment a second person worked,
  // which is worse than no log because it reads as a full record.
  const entry = { at: serverTimestamp(), actor: "partner-uid", actorEmail: "partner@brandmintstudios.in",
                  action: "scope.advance", summary: "moved a line" };
  await assertSucceeds(setDoc(doc(partner(), "activity/e1"), entry));
  await assertFails(getDocs(collection(partner(), "activity")));
  await assertSucceeds(getDocs(collection(admin(), "activity")));
});

test("nobody can rewrite the log, including a partner covering their tracks", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "activity/e9"), { at: new Date(), actor: "partner-uid", action: "x", summary: "y" });
  });
  await assertFails(updateDoc(doc(partner(), "activity/e9"), { summary: "nothing happened" }));
  await assertFails(deleteDoc(doc(partner(), "activity/e9")));
});

test("a partner cannot attribute a log entry to somebody else", async () => {
  await assertFails(setDoc(doc(partner(), "activity/e2"), {
    at: serverTimestamp(), actor: "admin-uid", actorEmail: ADMIN_EMAIL,
    action: "invoice.delete", summary: "not me",
  }));
});

/* ─────────── staff are not clients, and clients are not staff ─────────── */

test("a client cannot reach anything a staff role can", async () => {
  const db = client();
  await assertFails(getDocs(collection(db, "users")));
  await assertFails(getDoc(doc(db, "projects/inv-project")));
  await assertFails(setDoc(doc(db, "activity/e3"), {
    at: serverTimestamp(), actor: "gb-uid", actorEmail: "greenbasket@brandmintstudios.in",
    action: "x", summary: "y",
  }));
});

test("a signed-in account with NO users document reads nothing", async () => {
  // Fail-closed by construction: role() resolves to 'none' and every branch
  // denies. This is what makes a half-finished Client Access grant safe.
  const ghost = env.authenticatedContext("ghost-uid", { email: "ghost@brandmintstudios.in" }).firestore();
  await assertFails(getDoc(doc(ghost, "organisations/greenbasket")));
  await assertFails(getDoc(doc(ghost, "projects/gb-project")));
  await assertFails(getDoc(doc(ghost, "rates/collab-uid")));
});

test("a project with NO team is CEO-only, so silence is never universal access", async () => {
  // Every project written before this ruleset has no `team` field. It must
  // deny staff rather than admit them.
  await assertFails(getDoc(doc(partner(), "projects/inv-project")));
  await assertFails(getDoc(doc(collab(), "projects/inv-project")));
  await assertSucceeds(getDoc(doc(admin(), "projects/inv-project")));
});
