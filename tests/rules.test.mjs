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
  });
});

const admin = () => env.authenticatedContext("admin-uid", { email: ADMIN_EMAIL }).firestore();
const client = () => env.authenticatedContext("gb-uid", { email: "greenbasket@brandmintstudios.in" }).firestore();
const other = () => env.authenticatedContext("inv-uid", { email: "inventory@brandmintstudios.in" }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

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
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/intake/i1"), { done: true, clearedAt: new Date() })
  );
});

test("a client may approve or request changes on their own deliverable", async () => {
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: new Date(), decidedBy: "gb-uid",
    })
  );
  await assertSucceeds(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "changes_requested", decidedAt: new Date(), decidedBy: "gb-uid",
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
    updateDoc(doc(client(), "projects/gb-project/intake/i1"), { done: true, raisedAt: new Date(2020, 0, 1) })
  );
});

test("a client cannot set a deliverable to a status only we may set", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "in_review", decidedAt: new Date(), decidedBy: "gb-uid",
    })
  );
});

test("a client cannot rewrite a deliverable's title or url", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/gb-project/deliverables/d1"), {
      status: "approved", decidedAt: new Date(), decidedBy: "gb-uid", url: "https://evil.example",
    })
  );
});

test("a client cannot tick ANOTHER tenant's intake item", async () => {
  await assertFails(
    updateDoc(doc(client(), "projects/inv-project/intake/i1"), { done: true, clearedAt: new Date() })
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
