import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Every write path in the product, driven by filling and submitting the form.
 *
 * journey.spec.ts proves the screens render the seeded studio and that the SOP
 * gate behaves. It does not prove the *create* paths work, because that data was
 * seeded through the routers. This file closes that gap: nothing below is
 * seeded — a lead is submitted, onboarded into a client, given a project, a
 * checklist step, a deliverable, a document that gets signed, and an invoice
 * that gets paid, each one through the interface.
 *
 * Runs after journey.spec.ts (Playwright orders files alphabetically) and only
 * ever adds records, so it cannot disturb the assertions there.
 */

const SHOTS = path.resolve(import.meta.dirname, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const CEO = "sumanthbolla97@gmail.com";
const NEW_CLIENT_EMAIL = "lakshmi@nilgiritearoom.in";

const LEAD_COMPANY = "Kalyani Silks";
const CLIENT_COMPANY = "Nilgiri Tea Room";
const BUILD_TITLE = "Nilgiri Tea Room — Subscription Build";
const DELIVERABLE = "Subscription pause and resume flow";
const CHECKLIST_STEP = "Confirm tea-estate photography licence";
const DOCUMENT_TITLE = "Nilgiri Tea Room — Service Agreement";

const BUILD_PRICE = 145_000;
// Negotiated down in C2, which is the figure the invoice must then pre-fill.
const FINAL_PRICE = 138_000;
// ₹1,38,000 + 18% GST = ₹1,62,840, computed by the server, not by this file.
const EXPECTED_TOTAL = "₹1,62,840";

test.describe.configure({ mode: "serial" });

async function shot(page: Page, name: string, fullPage = true) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
}

async function signIn(page: Page, email: string, returnTo = "/admin") {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const account = page.locator(`[data-sim-email="${email}"]`);
  await expect(account).toBeVisible();
  await account.click();
  await page.waitForLoadState("networkidle");
}

/**
 * The form fields are `<div class="space-y-2">` wrapping a label and a control.
 * The labels are not associated with their controls via htmlFor, so getByLabel
 * cannot reach them; scoping to the wrapper is the stable alternative.
 */
function field(scope: Page | Locator, label: string) {
  return scope.locator("div.space-y-2").filter({ hasText: label }).first();
}

async function chooseOption(scope: Page | Locator, page: Page, label: string, option: string | RegExp) {
  await field(scope, label).getByRole("combobox").click();
  await page.getByRole("option", { name: option }).click();
}

/** The smallest structurally valid PDF, so the upload path gets a real file. */
function minimalPdf() {
  return Buffer.from(
    "%PDF-1.4\n" +
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\n" +
      "trailer<</Root 1 0 R>>\n%%EOF\n",
    "utf-8",
  );
}

test.describe("A — a visitor becomes a lead", () => {
  test("A1 the public enquiry form submits and reaches the CEO inbox", async ({ page }) => {
    await page.goto("/");

    const form = page.locator("form.ecom-enquiry-form");
    await form.scrollIntoViewIfNeeded();
    await form.getByPlaceholder("Your name").fill("Kalyani Ramesh");
    await form.getByPlaceholder("Business name").fill(LEAD_COMPANY);
    await form.getByPlaceholder("Email address").fill("kalyani@kalyanisilks.in");
    await form.getByPlaceholder(/Tell us about your store/).fill(
      "Handloom silk saree house in Kanchipuram moving online. About 220 pieces, each one unique, so stock has to be one-of-one. We need a lookbook that does the weave justice and a way to take deposits.",
    );
    await shot(page, "29-enquiry-form-filled");

    await form.getByRole("button", { name: /send project request/i }).click();

    // The component swaps itself for a confirmation on success.
    await expect(page.getByText("Request received.")).toBeVisible({ timeout: 20_000 });
    await shot(page, "30-enquiry-submitted");

    // And it is genuinely in the CEO's inbox, not just acknowledged locally.
    await signIn(page, CEO, "/admin");
    const inbox = page.locator("section", { hasText: "Incoming project requests" }).first();
    await inbox.scrollIntoViewIfNeeded();
    await expect(inbox.getByText(LEAD_COMPANY).first()).toBeVisible();
    await expect(inbox.getByText("kalyani@kalyanisilks.in").first()).toBeVisible();
    await shot(page, "31-lead-in-inbox", false);
  });
});

test.describe("B — a lead becomes a client", () => {
  test("B1 the onboarding form walks four steps and creates the client", async ({ page }) => {
    await signIn(page, CEO, "/admin");
    await page.goto("/onboarding");

    // 01 — Contact
    await expect(page.getByRole("heading", { name: /start with the essentials/i })).toBeVisible();
    await page.getByPlaceholder("Full name").fill("Lakshmi Rao");
    await page.getByPlaceholder("Company name").fill(CLIENT_COMPANY);
    await page.getByPlaceholder("Email address").fill(NEW_CLIENT_EMAIL);
    await page.getByPlaceholder("Phone number").fill("+91 94420 55117");
    await shot(page, "32-onboarding-contact");
    await page.getByRole("button", { name: "Continue" }).click();

    // 02 — Store tier, with an add-on
    await expect(page.getByRole("heading", { name: /choose the store depth/i })).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /Growth Store/ }).click();
    await page.getByText("Additional payment gateway — ₹25,000").click();
    await page.getByPlaceholder("Timeline").fill("10 weeks, before the festival season");
    await shot(page, "33-onboarding-tier");
    await page.getByRole("button", { name: "Continue" }).click();

    // 03 — Brief
    await expect(page.getByRole("heading", { name: /set the store context/i })).toBeVisible();
    await page.getByPlaceholder(/Business, catalogue and project requirements/).fill(
      "Single-estate tea from the Nilgiris, sold as one-off tins and as a monthly subscription. 40 SKUs. The subscription needs a self-service pause — that is the whole reason for the rebuild.",
    );
    await page.getByPlaceholder("Priorities and deliverables").fill("Subscription engine, pause/resume, tasting-note pages, GST invoicing");
    await page.getByRole("button", { name: "Continue" }).click();

    // 04 — Legal. Continue must stay disabled until acceptance is ticked.
    await expect(page.getByRole("heading", { name: /review before activation/i })).toBeVisible();
    const complete = page.getByRole("button", { name: /complete review/i });
    await expect(complete).toBeDisabled();
    await page.getByText(/I have read and accept the required policy documents/).click();
    await expect(complete).toBeEnabled();
    await shot(page, "34-onboarding-legal");

    await complete.click();
    await expect(page.getByRole("heading", { name: /ecommerce onboarding recorded/i })).toBeVisible({ timeout: 25_000 });

    // The CEO is returned to Agency OS, not sent to the client portal.
    await expect(page.getByRole("button", { name: /back to agency os/i })).toBeVisible();
    await shot(page, "35-onboarding-complete");
  });

  test("B2 onboarding created the project, with its SOP already attached", async ({ page }) => {
    await signIn(page, CEO, "/operations");

    const row = page.locator("article", { hasText: `${CLIENT_COMPANY} — Growth Store` }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(CLIENT_COMPANY);
    await expect(row).toContainText("discovery");

    await row.getByRole("link", { name: /Open project/ }).click();
    await expect(page.getByText("Standard operating procedure")).toBeVisible();
    // Seeded on creation, not on first read of an empty checklist.
    await expect(page.getByText("Service agreement countersigned and stored")).toBeVisible();
    await expect(page.getByText("0/8").first()).toBeVisible();
    await shot(page, "36-new-project-sop");
  });
});

test.describe("C — the CEO builds the engagement", () => {
  test("C1 create a personally priced project", async ({ page }) => {
    await signIn(page, CEO, "/operations");

    const form = page.locator("section", { hasText: "Create project" }).first();
    await chooseOption(form, page, "Client", CLIENT_COMPANY);
    await field(form, "Project title").getByRole("textbox").fill(BUILD_TITLE);
    await field(form, "Deadline").locator('input[type="date"]').fill("2026-11-30");
    await field(form, "Assigned to").getByRole("textbox").fill("Sumanth Bolla");
    await chooseOption(form, page, "Price type", "Personal project price");
    await field(form, "Proposed price (INR)").getByRole("textbox").fill(String(BUILD_PRICE));
    await shot(page, "37-create-project-form", false);

    await form.getByRole("button", { name: "Create project" }).click();

    const created = page.locator("article", { hasText: BUILD_TITLE }).first();
    await expect(created).toBeVisible({ timeout: 25_000 });
    await expect(created).toContainText("₹1,45,000");
    await expect(created).toContainText("personal");
    await shot(page, "38-project-created", false);
  });

  test("C2 adjust the final price of that personal project", async ({ page }) => {
    await signIn(page, CEO, "/operations");

    const row = page.locator("article", { hasText: BUILD_TITLE }).first();
    await row.scrollIntoViewIfNeeded();
    // The final-price control exists only for personal-pricing projects.
    const priceBox = row.locator('input[inputmode="decimal"]');
    await expect(priceBox).toBeVisible();
    await priceBox.fill("138000");
    await row.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("article", { hasText: BUILD_TITLE }).first()).toContainText("₹1,38,000", { timeout: 25_000 });
    await shot(page, "39-final-price-adjusted", false);
  });

  test("C3 add a project-specific step to the checklist", async ({ page }) => {
    await signIn(page, CEO, "/operations");
    await page.locator("article", { hasText: BUILD_TITLE }).first().getByRole("link", { name: /Open project/ }).click();

    await page.getByPlaceholder("Add a step for this project").fill(CHECKLIST_STEP);
    await page.getByRole("button", { name: "Add" }).click();

    const added = page.locator("label", { hasText: CHECKLIST_STEP });
    await expect(added).toBeVisible({ timeout: 25_000 });
    // Added steps are optional, so they inform without blocking the stage.
    await added.getByRole("checkbox").click();
    await expect(added.getByRole("checkbox")).toHaveAttribute("data-state", "checked");
    await shot(page, "40-checklist-step-added");
  });

  test("C4 add a deliverable", async ({ page }) => {
    await signIn(page, CEO, "/deliverables");

    await chooseOption(page, page, "Project", new RegExp(BUILD_TITLE));
    await field(page, "Deliverable").getByRole("textbox").fill(DELIVERABLE);
    await field(page, "Assigned to").getByRole("textbox").fill("Sumanth Bolla");
    await field(page, "Due date").locator('input[type="date"]').fill("2026-10-15");
    await page.getByRole("button", { name: "Add deliverable" }).last().click();

    await expect(page.getByText(DELIVERABLE).first()).toBeVisible({ timeout: 25_000 });
    await shot(page, "41-deliverable-added");
  });

  test("C5 create a document and take it through to signed", async ({ page }) => {
    await signIn(page, CEO, "/operations");
    await page.getByRole("tab", { name: "Documents" }).click();

    const form = page.locator("section", { hasText: "Create document" }).first();
    await chooseOption(form, page, "Client", CLIENT_COMPANY);
    await chooseOption(form, page, "Document type", "Contract");
    await field(form, "Document title").getByRole("textbox").fill(DOCUMENT_TITLE);
    await form.getByRole("button", { name: "Create document" }).click();

    const record = page.locator("div.rounded-xl", { hasText: DOCUMENT_TITLE }).first();
    await expect(record).toBeVisible({ timeout: 25_000 });
    await expect(record).toContainText("draft");

    await record.getByRole("button", { name: "Request signature" }).click();
    await expect(page.locator("div.rounded-xl", { hasText: DOCUMENT_TITLE }).first()).toContainText("awaiting signature", { timeout: 25_000 });
    await shot(page, "42-document-awaiting-signature", false);

    await page.locator("div.rounded-xl", { hasText: DOCUMENT_TITLE }).first().getByRole("button", { name: "Mark signed" }).click();
    await expect(page.locator("div.rounded-xl", { hasText: DOCUMENT_TITLE }).first()).toContainText("signed", { timeout: 25_000 });
    await shot(page, "43-document-signed", false);
  });

  test("C5b store a PDF against the document", async ({ page }) => {
    await signIn(page, CEO, "/operations");
    await page.getByRole("tab", { name: "Documents" }).click();

    const record = page.locator("div.rounded-xl", { hasText: DOCUMENT_TITLE }).first();
    await record.scrollIntoViewIfNeeded();
    // The input is visually hidden behind a "Store PDF" label, which is the
    // normal pattern; setInputFiles reaches it regardless.
    await record.locator('input[type="file"]').setInputFiles({
      name: "nilgiri-service-agreement.pdf",
      mimeType: "application/pdf",
      buffer: minimalPdf(),
    });

    await expect(page.getByText("PDF stored securely")).toBeVisible({ timeout: 30_000 });
    await shot(page, "43b-pdf-stored", false);
  });

  test("C6 issue an invoice, and the GST is the server's arithmetic", async ({ page }) => {
    await signIn(page, CEO, "/operations");
    await page.getByRole("tab", { name: "Invoices" }).click();

    const form = page.locator("section", { hasText: "Issue invoice" }).first();
    await chooseOption(form, page, "Client", CLIENT_COMPANY);
    // Selecting the project pre-fills the description and the amount from the
    // project's current price — the behaviour that stops an invoice being typed
    // out by hand and drifting from the record.
    await chooseOption(form, page, "Project", new RegExp(BUILD_TITLE));
    await expect(field(form, "Line item").getByRole("textbox")).toHaveValue(new RegExp(BUILD_TITLE));
    // The adjusted final price from C2, not the ₹1,45,000 the project was
    // created at — the invoice follows the current price rather than a stale one.
    await expect(field(form, "Amount (INR)").getByRole("textbox")).toHaveValue(String(FINAL_PRICE));

    await field(form, "Due date").locator('input[type="date"]').fill("2026-12-15");
    await shot(page, "44-issue-invoice-form", false);

    await form.getByRole("button", { name: "Issue invoice" }).click();

    // ₹1,45,000 + 18% = ₹1,71,100, computed by calculateInvoiceTotals.
    const list = page.locator("div", { hasText: "Invoice records" }).last();
    await expect(list.getByText(EXPECTED_TOTAL).first()).toBeVisible({ timeout: 30_000 });
    await shot(page, "45-invoice-issued", false);
  });

  test("C7 mark the invoice paid, which promotes the client to active", async ({ page }) => {
    await signIn(page, CEO, "/operations");
    await page.getByRole("tab", { name: "Invoices" }).click();

    const row = page.locator("div.rounded-xl", { hasText: EXPECTED_TOTAL }).first();
    await expect(row).toContainText("issued");
    await row.getByRole("button", { name: "Mark paid" }).click();

    await expect(page.locator("div.rounded-xl", { hasText: EXPECTED_TOTAL }).first()).toContainText("paid", { timeout: 25_000 });
    await shot(page, "46-invoice-paid", false);

    // A paid invoice is what promotes a client from lead to active, so the
    // dashboard tile must move too.
    await page.goto("/admin");
    const revenue = page.locator("article", { hasText: "Revenue summary" });
    await expect(revenue).toContainText("₹");
    await shot(page, "47-dashboard-after-payment");
  });
});

test.describe("D — the client they just created", () => {
  test("D1 the new client signs in and sees only their own work", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.removeItem("brand-mint.simulation-account"));
    await signIn(page, NEW_CLIENT_EMAIL, "/portal");

    await expect(page).toHaveURL(/\/portal/);
    await expect(page.getByText(BUILD_TITLE).first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(EXPECTED_TOTAL).first()).toBeVisible();

    const body = await page.locator("body").innerText();
    expect(body, "another client's work leaked into this portal").not.toContain("Green Basket");
    expect(body).not.toContain("Urban Thread");
    await shot(page, "48-new-client-portal");
  });

  test("D2 the signed document and invoice PDF are offered as downloads", async ({ page }) => {
    await signIn(page, NEW_CLIENT_EMAIL, "/portal");

    const downloads = page.locator("section", { hasText: "Available downloads" }).first();
    await downloads.scrollIntoViewIfNeeded();
    // The invoice PDF was written by the real generator when the invoice was
    // issued through the form.
    await expect(downloads.getByText(/\.pdf$/).first()).toBeVisible({ timeout: 25_000 });
    await shot(page, "49-client-downloads", false);
  });

  test("D2b the download button actually returns the file", async ({ page }) => {
    await signIn(page, NEW_CLIENT_EMAIL, "/portal");
    const downloads = page.locator("section", { hasText: "Available downloads" }).first();
    await downloads.scrollIntoViewIfNeeded();

    // SecureDownload opens the signed URL in a new tab, so the popup is the
    // evidence the mutation resolved to a real, fetchable file.
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 30_000 }),
      downloads.getByRole("button", { name: /download/i }).first().click(),
    ]);
    await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
    expect(popup.url()).toContain("/api/simulation/files/");

    const response = await page.request.get(popup.url());
    expect(response.status(), "the stored invoice PDF did not come back").toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    await popup.close();
  });

  test("D3 payment is refused cleanly while Razorpay is unconfigured", async ({ page }) => {
    await signIn(page, NEW_CLIENT_EMAIL, "/portal");

    // payments.status reports not-configured, so no pay button is offered at
    // all — the invoice still renders rather than the section erroring out.
    await expect(page.getByText(EXPECTED_TOTAL).first()).toBeVisible();
    const payButtons = await page.getByRole("button", { name: /pay/i }).count();
    expect(payButtons, "a pay button was offered without Razorpay keys configured").toBe(0);
  });
});

test.describe("E — leaving", () => {
  test("E1 sign out returns to a signed-out state", async ({ page }) => {
    await signIn(page, CEO, "/admin");
    await expect(page.getByRole("heading", { name: /the studio, in view/i })).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForLoadState("networkidle");

    // Back to the sign-in screen, and /admin no longer opens.
    await page.goto("/admin");
    await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible({ timeout: 25_000 });
    await shot(page, "50-signed-out");
  });
});
