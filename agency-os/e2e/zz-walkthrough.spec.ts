import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * The agency process, one client, both sides at once.
 *
 * Two browsers stay open for the whole run: the CEO in Agency OS and the client
 * in their portal. After every move the CEO makes, both are photographed, so
 * each step of the process can be read as "this is what you did, this is what
 * they saw".
 *
 * It starts by emptying the database — first through the Reset all button in the
 * interface, then through the simulation's own reset so the client records go
 * too — and then builds exactly one client. Nothing else is in view.
 *
 * Named zz- so it runs last: it wipes the studio the other two specs assert on.
 *
 *   npx playwright test zz-walkthrough
 *   python3 e2e/build-walkthrough.py
 */

const SHOTS = path.resolve(import.meta.dirname, "walkthrough");
fs.mkdirSync(SHOTS, { recursive: true });

const CEO = "sumanthbolla97@gmail.com";
const CLIENT_EMAIL = "arjun@deccanbloom.in";
const COMPANY = "Deccan Bloom";
const PROJECT = `${COMPANY} — Growth Store`;

// These run in order and depend on each other: the two browsers and the studio
// they are building persist across them. The config already guarantees that
// with workers: 1 and fullyParallel: false.

let admin: Page;
let client: Page;

async function openBoth(browser: Browser) {
  const viewport = { width: 1440, height: 900 };
  const adminContext = await browser.newContext({ baseURL: "http://localhost:3000", viewport });
  const clientContext = await browser.newContext({ baseURL: "http://localhost:3000", viewport });
  admin = await adminContext.newPage();
  client = await clientContext.newPage();
}

async function signIn(page: Page, email: string, returnTo: string) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const account = page.locator(`[data-sim-email="${email}"]`);
  await expect(account).toBeVisible();
  await account.click();
  await page.waitForLoadState("networkidle");
}

/** Photographs both sides of the same moment. */
async function capture(step: string) {
  await admin.waitForTimeout(500);
  await client.waitForTimeout(500);
  await admin.screenshot({ path: path.join(SHOTS, `${step}-admin.png`), fullPage: true });
  await client.screenshot({ path: path.join(SHOTS, `${step}-client.png`), fullPage: true });
}

/** Reloads the client's view so it reflects what the CEO just did. */
async function refreshClient(to = "/portal") {
  await client.goto(to);
  await client.waitForLoadState("networkidle");
  await client.waitForTimeout(700);
}

function field(scope: Page | Locator, label: string) {
  return scope.locator("div.space-y-2").filter({ hasText: label }).first();
}

async function chooseOption(scope: Page | Locator, page: Page, label: string, option: string | RegExp) {
  await field(scope, label).getByRole("combobox").click();
  await page.getByRole("option", { name: option }).click();
}

/**
 * Ticks every open checklist step on the project page, re-querying each time
 * because the list re-renders after each mutation. The bound is a runaway guard,
 * not an expected count.
 */
async function tickEveryOpenStep(page: Page, limit = 60) {
  for (let attempt = 0; attempt < limit; attempt += 1) {
    const open = page.locator('button[role="checkbox"][data-state="unchecked"]').first();
    if ((await open.count()) === 0) return;
    await open.scrollIntoViewIfNeeded();
    await open.click();
    await page.waitForTimeout(450);
  }
  throw new Error("Checklist steps did not finish within the guard limit");
}

test.describe("The agency process, both sides", () => {
  test.beforeAll(async ({ browser }) => {
    await openBoth(browser);
  });

  test.afterAll(async ({ browser }) => {
    // This spec empties the studio deliberately. Put the standard seed back, or
    // the next run against a still-running server finds nothing to assert on.
    const restore = await browser.newContext({ baseURL: "http://localhost:3000" });
    await restore.request.post("/api/simulation/reseed").catch(() => undefined);
    await restore.close();

    await admin?.context().close();
    await client?.context().close();
  });

  test("00 the studio is emptied, using the Reset all button", async ({ request }) => {
    await signIn(admin, CEO, "/admin");
    await expect(admin.getByRole("heading", { name: /the studio, in view/i })).toBeVisible();

    // The button is a two-click guard: the first arms it, the second commits.
    const reset = admin.getByRole("button", { name: /reset all/i });
    await reset.click();
    const confirm = admin.getByRole("button", { name: /click again to confirm/i });
    await expect(confirm).toBeVisible();
    await confirm.click();

    // The toast carries the count, which is the proof the mutation ran rather
    // than merely that the button was clickable.
    await expect(admin.getByText(/Reset complete\. Deleted \d+ documents/)).toBeVisible({ timeout: 25_000 });

    // Scoped to a desktop pipeline column: the same empty-state text also exists
    // in the phone-only block earlier in the document, where it is hidden.
    await expect(admin.locator(".pipeline-column").first().getByText("No project here")).toBeVisible({ timeout: 25_000 });

    // That button deliberately leaves client records alone. The simulation's own
    // reset finishes the job, so this walkthrough starts from a blank studio.
    await request.post("/api/simulation/reset");

    await admin.goto("/admin");
    await client.goto("/portal");
    await capture("step-01-empty");
  });

  test("01 the client sends a project request", async () => {
    await client.goto("/");
    const form = client.locator("form.ecom-enquiry-form");
    await form.scrollIntoViewIfNeeded();
    await form.getByPlaceholder("Your name").fill("Arjun Varma");
    await form.getByPlaceholder("Business name").fill(COMPANY);
    await form.getByPlaceholder("Email address").fill(CLIENT_EMAIL);
    await form.getByPlaceholder(/Tell us about your store/).fill(
      "We run a plant and dried-flower studio in Jubilee Hills. About 150 living products that need care instructions on every page, and we can only deliver within the city. Instagram is doing the selling and we cannot keep up with the DMs.",
    );
    await capture("step-02-enquiry-filled");

    await form.getByRole("button", { name: /send project request/i }).click();
    await expect(client.getByText("Request received.")).toBeVisible({ timeout: 20_000 });

    // The CEO's inbox now holds it.
    await admin.goto("/admin");
    await admin.locator("section", { hasText: "Incoming project requests" }).first().scrollIntoViewIfNeeded();
    await expect(admin.getByText(COMPANY).first()).toBeVisible();
    await capture("step-03-request-received");
  });

  test("02 the CEO onboards them into a client", async () => {
    await admin.goto("/onboarding");
    await admin.getByPlaceholder("Full name").fill("Arjun Varma");
    await admin.getByPlaceholder("Company name").fill(COMPANY);
    await admin.getByPlaceholder("Email address").fill(CLIENT_EMAIL);
    await admin.getByPlaceholder("Phone number").fill("+91 90005 41288");
    await capture("step-04-onboarding-contact");
    await admin.getByRole("button", { name: "Continue" }).click();

    await admin.getByRole("combobox").click();
    await admin.getByRole("option", { name: /Growth Store/ }).click();
    await admin.getByText("Extra design revision round — ₹15,000").click();
    await admin.getByPlaceholder("Timeline").fill("12 weeks");
    await capture("step-05-onboarding-tier");
    await admin.getByRole("button", { name: "Continue" }).click();

    await admin.getByPlaceholder(/Business, catalogue and project requirements/).fill(
      "Plant and dried-flower studio. 150 living SKUs, each needing care instructions. Delivery is Hyderabad-only, so the checkout has to refuse out-of-area postcodes rather than take the order and disappoint.",
    );
    await admin.getByPlaceholder("Priorities and deliverables").fill("Catalogue with care notes, postcode-gated checkout, care-reminder emails");
    await admin.getByRole("button", { name: "Continue" }).click();

    await expect(admin.getByRole("button", { name: /complete review/i })).toBeDisabled();
    await admin.getByText(/I have read and accept the required policy documents/).click();
    await capture("step-06-onboarding-legal");

    await admin.getByRole("button", { name: /complete review/i }).click();
    await expect(admin.getByRole("heading", { name: /ecommerce onboarding recorded/i })).toBeVisible({ timeout: 25_000 });
    await capture("step-07-onboarding-complete");
  });

  test("03 the client signs in and finds their project waiting", async () => {
    await admin.goto("/admin");
    await signIn(client, CLIENT_EMAIL, "/portal");
    await expect(client.getByText(PROJECT)).toBeVisible({ timeout: 25_000 });
    await capture("step-08-client-first-sign-in");
  });

  test("04 the CEO works the discovery checklist", async () => {
    await admin.goto("/operations");
    await admin.locator("article", { hasText: PROJECT }).first().getByRole("link", { name: /Open project/ }).click();
    await expect(admin.getByText("Standard operating procedure")).toBeVisible();
    await capture("step-09-sop-at-start");

    // Tick every required discovery step, which is what unlocks the next stage.
    const required = admin.locator("article", { hasText: "Kickoff call held" }).first();
    const boxes = required.locator('button[role="checkbox"][data-state="unchecked"]');
    for (let i = await boxes.count(); i > 0; i -= 1) {
      const box = boxes.first();
      if (!(await box.isVisible().catch(() => false))) break;
      await box.click();
      await admin.waitForTimeout(700);
    }
    await refreshClient();
    await capture("step-10-discovery-worked");
  });

  test("05 the project moves to In progress", async () => {
    await admin.getByRole("button", { name: /^In progress/ }).click();
    await expect(admin.getByRole("button", { name: /^In progress/ })).toHaveAttribute("aria-current", "true", { timeout: 25_000 });
    await refreshClient();
    await capture("step-11-stage-in-progress");
  });

  test("06 deliverables are added, and the client sees the plan", async () => {
    await admin.goto("/deliverables");
    for (const title of ["Catalogue with care instructions", "Postcode-gated checkout", "Care-reminder email flow"]) {
      await chooseOption(admin, admin, "Project", new RegExp(PROJECT));
      await field(admin, "Deliverable").getByRole("textbox").fill(title);
      await admin.getByRole("button", { name: "Add deliverable" }).last().click();
      await expect(admin.getByText(title).first()).toBeVisible({ timeout: 25_000 });
    }
    await refreshClient();
    await capture("step-12-deliverables-added");
  });

  test("07 the service agreement goes out and comes back signed", async () => {
    await admin.goto("/operations");
    await admin.getByRole("tab", { name: "Documents" }).click();
    const form = admin.locator("section", { hasText: "Create document" }).first();
    await chooseOption(form, admin, "Client", COMPANY);
    await chooseOption(form, admin, "Document type", "Contract");
    await field(form, "Document title").getByRole("textbox").fill(`${COMPANY} — Service Agreement`);
    await form.getByRole("button", { name: "Create document" }).click();

    const record = admin.locator("div.rounded-xl", { hasText: "Service Agreement" }).first();
    await expect(record).toBeVisible({ timeout: 25_000 });
    await record.getByRole("button", { name: "Request signature" }).click();
    await expect(admin.locator("div.rounded-xl", { hasText: "Service Agreement" }).first()).toContainText("awaiting signature", { timeout: 25_000 });
    await refreshClient();
    await capture("step-13-agreement-awaiting-signature");

    await admin.locator("div.rounded-xl", { hasText: "Service Agreement" }).first().getByRole("button", { name: "Mark signed" }).click();
    await expect(admin.locator("div.rounded-xl", { hasText: "Service Agreement" }).first()).toContainText("signed", { timeout: 25_000 });
    await refreshClient();
    await capture("step-14-agreement-signed");
  });

  test("08 the invoice is issued", async () => {
    await admin.getByRole("tab", { name: "Invoices" }).click();
    const form = admin.locator("section", { hasText: "Issue invoice" }).first();
    await chooseOption(form, admin, "Client", COMPANY);
    await chooseOption(form, admin, "Project", new RegExp(PROJECT));
    await field(form, "Due date").locator('input[type="date"]').fill("2026-12-20");
    await capture("step-15-invoice-form");

    await form.getByRole("button", { name: "Issue invoice" }).click();
    // Growth Store is ₹2,00,000; with 18% GST that is ₹2,36,000.
    await expect(admin.getByText("₹2,36,000").first()).toBeVisible({ timeout: 30_000 });
    await refreshClient();
    await expect(client.getByText("₹2,36,000").first()).toBeVisible({ timeout: 25_000 });
    await capture("step-16-invoice-issued");
  });

  test("09 payment is recorded", async () => {
    await admin.goto("/operations");
    await admin.getByRole("tab", { name: "Invoices" }).click();
    const row = admin.locator("div.rounded-xl", { hasText: "₹2,36,000" }).first();
    await row.getByRole("button", { name: "Mark paid" }).click();
    await expect(admin.locator("div.rounded-xl", { hasText: "₹2,36,000" }).first()).toContainText("paid", { timeout: 25_000 });
    await refreshClient();
    await capture("step-17-invoice-paid");
  });

  test("10 the work is reviewed and completed", async () => {
    await admin.goto("/operations");
    await admin.locator("article", { hasText: PROJECT }).first().getByRole("link", { name: /Open project/ }).click();

    // Finish the whole checklist first, so both remaining moves are permitted
    // outright. Racing the refusal dialog made this step flaky, and the gate and
    // its override are covered properly in journey.spec.ts anyway.
    await tickEveryOpenStep(admin);

    // Reload before advancing. Without it the stage change can be sent while the
    // last checkbox write is still in flight, and the server — reading its own
    // state, correctly — refuses the move.
    await admin.reload();
    await admin.waitForLoadState("networkidle");

    for (const next of ["Client review", "Complete"]) {
      const target = admin.getByRole("button", { name: new RegExp(`^${next}`) });
      await target.click();

      // Either it moves, or the SOP refuses and says why. Wait for whichever
      // arrives rather than assuming.
      const refusal = admin.getByRole("alert");
      await Promise.race([
        target.getAttribute("aria-current").then(async () => {
          await expect(target).toHaveAttribute("aria-current", "true", { timeout: 20_000 });
        }).catch(() => undefined),
        refusal.waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined),
      ]);
      if (await refusal.isVisible().catch(() => false)) {
        await refusal.getByRole("button", { name: "Move anyway" }).click();
      }

      await expect(target).toHaveAttribute("aria-current", "true", { timeout: 30_000 });
    }

    await refreshClient();
    await capture("step-18-project-complete");

    await admin.goto("/admin");
    await refreshClient();
    await capture("step-19-final-dashboard");
  });
});
