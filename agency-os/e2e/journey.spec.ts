import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * The Green Basket journey, driven through the real interface.
 *
 * Every step below clicks what a person would click. The application under test
 * is the production React client and the production tRPC routers; only Firestore
 * and Cloud Storage are the in-memory doubles from server/simulation, seeded at
 * boot by driving those same routers.
 *
 * Screenshots land in e2e/screenshots and are numbered in journey order.
 */

const SHOTS = path.resolve(import.meta.dirname, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const CEO = "sumanthbolla97@gmail.com";
const GREEN_BASKET_CLIENT = "rajesh@greenbasket.com";
const NO_RECORD_ACCOUNT = "ananya.iyer.blr@gmail.com";
const GREEN_BASKET_PROJECT = "Green Basket — E-Commerce Redesign";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };

async function shot(page: Page, name: string, fullPage = true) {
  await page.waitForTimeout(350); // let entry animations settle
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
}

/** Signs in through the real sign-in screen by choosing an account. */
async function signIn(page: Page, email: string, returnTo = "/admin") {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const account = page.locator(`[data-sim-email="${email}"]`);
  await expect(account).toBeVisible();
  await account.click();
  await page.waitForLoadState("networkidle");
}

async function signOutViaStorage(page: Page) {
  // localStorage is per-origin, and a fresh page sits on about:blank where it
  // cannot be read at all. Land on the app first.
  if (!page.url().startsWith("http")) await page.goto("/");
  await page.evaluate(() => window.localStorage.removeItem("brand-mint.simulation-account"));
}

/** No screen may ever render a NaN rupee amount. */
async function expectNoBrokenMoney(page: Page) {
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  expect(body, "a rupee amount rendered as NaN").not.toContain("₹NaN");
  expect(body, "a raw NaN leaked into the page").not.toMatch(/\bNaN\b/);
  expect(body, "undefined leaked into the page").not.toContain("undefined");
}

test.describe("Phase 1 — the public site", () => {
  test("01 the marketing site loads and offers a way in", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /start a project/i }).first()).toBeVisible();
    await expectNoBrokenMoney(page);
    await shot(page, "01-public-home-desktop");
  });

  test("02 the public site on a phone", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The page must not scroll sideways on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "the public home page scrolls horizontally on a 390px viewport").toBeLessThanOrEqual(1);
    await shot(page, "02-public-home-mobile");
  });

  test("03 the sign-in screen lists the studio accounts", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.locator(`[data-sim-email="${CEO}"]`)).toBeVisible();
    await expect(page.locator(`[data-sim-email="${GREEN_BASKET_CLIENT}"]`)).toBeVisible();
    await shot(page, "03-sign-in-accounts");
  });
});

test.describe("Phase 2 — the CEO dashboard", () => {
  test("04 signing in as the CEO opens Agency OS", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: /the studio, in view/i })).toBeVisible();

    // The four metric tiles must carry real numbers, not placeholders.
    await expect(page.getByText("Active clients")).toBeVisible();
    await expect(page.getByText("Revenue summary")).toBeVisible();
    const revenue = await page.locator("article", { hasText: "Revenue summary" }).innerText();
    expect(revenue, "the revenue tile is still showing its placeholder").not.toContain("—");
    expect(revenue).toContain("₹");

    await expectNoBrokenMoney(page);
    await shot(page, "04-ceo-dashboard");
  });

  test("05 the lead inbox holds the public enquiries", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");

    const inbox = page.locator("section", { hasText: "Incoming project requests" }).first();
    await expect(inbox.getByText("Green Basket").first()).toBeVisible();
    await expect(inbox.getByText("Deccan Coffee Roasters").first()).toBeVisible();
    await inbox.scrollIntoViewIfNeeded();
    await shot(page, "05-lead-inbox");
  });

  test("06 the pipeline shows every stage and its projects", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");

    const pipeline = page.locator("#projects");
    await pipeline.scrollIntoViewIfNeeded();
    for (const stage of ["Discovery", "In progress", "Client review", "Complete"]) {
      await expect(pipeline.getByRole("heading", { name: stage, exact: true })).toBeVisible();
    }
    // The ₹95,000 build sits in Client review, and the card is a real link.
    const card = pipeline.getByRole("link", { name: new RegExp(GREEN_BASKET_PROJECT) });
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("href", /\/projects\/\d+/);
    await shot(page, "06-project-pipeline");
  });

  test("07 the invoice list renders amounts, never NaN", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");

    const invoices = page.locator("#invoices");
    await invoices.scrollIntoViewIfNeeded();
    const text = await invoices.innerText();
    expect(text).toContain("₹");
    expect(text).not.toContain("NaN");
    // Every invoice row carries its number, so no row is blank on the left.
    await expect(invoices.getByText(/BM-\d{4}-/).first()).toBeVisible();
    await shot(page, "07-invoices-dashboard", false);
  });
});

test.describe("Phase 3 — the project and its SOP", () => {
  test("08 a pipeline card opens the project", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");

    await page.locator("#projects").scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: new RegExp(GREEN_BASKET_PROJECT) }).click();

    await expect(page).toHaveURL(/\/projects\/\d+/);
    await expect(page.getByRole("heading", { name: GREEN_BASKET_PROJECT })).toBeVisible();
    // The negotiated ₹95,000, and the pricing mode that permits it.
    await expect(page.getByText("₹95,000")).toBeVisible();
    await expect(page.getByText(/self-funded/)).toBeVisible();
    await expectNoBrokenMoney(page);
    await shot(page, "08-project-detail");
  });

  test("09 the SOP checklist is visible per stage with required steps marked", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");
    await page.goto(await projectUrl(page));

    await expect(page.getByText("Standard operating procedure")).toBeVisible();
    await expect(page.getByText("Internal QA pass — Lighthouse 90+ on all four axes")).toBeVisible();
    await expect(page.getByText("Required").first()).toBeVisible();

    // Discovery is finished, client review is not — the counters must say so.
    const discovery = page.locator("article", { hasText: "Kickoff call held" }).first();
    await expect(discovery.getByText(/^\d+\/\d+$/)).toBeVisible();
    await shot(page, "09-sop-checklist");
  });

  test("10 ticking a required step persists", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");
    await page.goto(await projectUrl(page));

    const row = page.locator("label", { hasText: "Cross-browser check" }).first();
    await row.scrollIntoViewIfNeeded();
    const box = row.getByRole("checkbox");
    const before = await box.getAttribute("data-state");
    const after = before === "checked" ? "unchecked" : "checked";

    await box.click();
    await expect(box).toHaveAttribute("data-state", after, { timeout: 15_000 });
    await shot(page, "10-checklist-item-ticked");

    // Survives a reload, which means the toggle reached the server rather than
    // only the component's local state.
    await page.reload();
    const reloaded = page.locator("label", { hasText: "Cross-browser check" }).first();
    await reloaded.scrollIntoViewIfNeeded();
    await expect(reloaded.getByRole("checkbox")).toHaveAttribute("data-state", after);

    // Leave it as it was found, so the run is repeatable.
    await reloaded.getByRole("checkbox").click();
    await expect(reloaded.getByRole("checkbox")).toHaveAttribute("data-state", before ?? "unchecked");
  });

  test("11 the SOP refuses a stage move and names what is outstanding", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");
    await page.goto(await projectUrl(page));

    // Client review still has required steps open, so Complete must be refused.
    await page.getByRole("button", { name: /^Complete/ }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Finish these before leaving Client review/i);
    await expect(alert).toContainText("Final 50% balance invoice issued");
    await expect(alert.getByRole("button", { name: "Move anyway" })).toBeVisible();
    await expect(alert.getByRole("button", { name: "Keep working" })).toBeVisible();

    await shot(page, "11-sop-gate-blocks-stage-change");

    // The project did not move.
    await expect(page.getByRole("button", { name: /Client review/ })).toHaveAttribute("aria-current", "true");
  });

  test("12 the override is offered, and moves the project", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");
    await page.goto(await projectUrl(page));

    await page.getByRole("button", { name: /^Complete/ }).click();
    await page.getByRole("alert").getByRole("button", { name: "Move anyway" }).click();

    await expect(page.getByRole("button", { name: /^Complete/ })).toHaveAttribute("aria-current", "true", { timeout: 20_000 });
    await shot(page, "12-stage-moved-with-override");

    // Put it back where the rest of the run expects it. A backward move is
    // always permitted, which is itself the behaviour being exercised here.
    await page.getByRole("button", { name: /Client review/ }).click();
    await expect(page.getByRole("button", { name: /Client review/ })).toHaveAttribute("aria-current", "true", { timeout: 20_000 });
  });

  test("13 deliverables and invoices are listed on the project", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");
    await page.goto(await projectUrl(page));

    const deliverables = page.locator("article", { hasText: "Deliverables" }).first();
    await deliverables.scrollIntoViewIfNeeded();
    await expect(deliverables.getByText("UPI-first checkout flow")).toBeVisible();

    const invoices = page.locator("article", { hasText: "Invoices" }).first();
    await expect(invoices.getByText(/BM-\d{4}-/)).toBeVisible();
    // ₹95,000 + ₹5,000 + ₹7,500 = ₹1,07,500, +18% GST = ₹1,26,850.
    await expect(invoices.getByText("₹1,26,850")).toBeVisible();
    await shot(page, "13-deliverables-and-invoice", false);
  });
});

test.describe("Phase 4 — operations, and the phone", () => {
  test("14 the operations workspace exposes projects, documents and invoices", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/operations");

    await expect(page.getByRole("heading", { name: /manage the work/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Projects" })).toBeVisible();
    await shot(page, "14-operations-projects");

    await page.getByRole("tab", { name: "Documents" }).click();
    await expect(page.getByText("Green Basket — Service Agreement")).toBeVisible();
    await shot(page, "15-operations-documents");

    await page.getByRole("tab", { name: "Invoices" }).click();
    await expect(page.getByRole("button", { name: "Issue invoice" })).toBeVisible();
    await expect(page.getByText(/BM-\d{4}-/).first()).toBeVisible();
    await expectNoBrokenMoney(page);
    await shot(page, "16-operations-invoices");
  });

  test("17 the phone gets a working drawer to every admin page", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page, CEO, "/admin");

    // The desktop sidebar is deliberately hidden here.
    await expect(page.locator(".agency-sidebar")).toBeHidden();

    const toggle = page.getByRole("button", { name: /open menu/i });
    await expect(toggle).toBeVisible();
    // A tap target must actually be tappable.
    const size = await toggle.boundingBox();
    expect(size!.width).toBeGreaterThanOrEqual(32);
    expect(size!.height).toBeGreaterThanOrEqual(32);

    await toggle.click();
    const drawer = page.getByRole("navigation", { name: /operations navigation/i }).last();
    await expect(drawer).toBeVisible();
    await shot(page, "17-mobile-drawer-open");

    // And it navigates.
    await drawer.getByRole("link", { name: "Invoices" }).click();
    await expect(page).toHaveURL(/\/operations/);
    await expect(page.getByRole("heading", { name: /manage the work/i })).toBeVisible();
    await shot(page, "18-mobile-operations");
  });

  test("19 the pipeline picks one stage at a time on a phone", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page, CEO, "/admin");

    await page.locator("#projects").scrollIntoViewIfNeeded();
    const clientReview = page.getByRole("button", { name: /^Client review/ });
    await clientReview.click();
    await expect(clientReview).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: new RegExp(GREEN_BASKET_PROJECT) })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "the dashboard scrolls horizontally on a 390px viewport").toBeLessThanOrEqual(1);
    await shot(page, "19-mobile-pipeline");
  });

  test("20 the project page works on a phone", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page, CEO, "/admin");
    await page.goto(await projectUrl(page));

    await expect(page.getByRole("heading", { name: GREEN_BASKET_PROJECT })).toBeVisible();
    await expect(page.getByText("Standard operating procedure")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await shot(page, "20-mobile-project-detail");
  });

  test("21 the workspace holds together on a tablet", async ({ page }) => {
    await page.setViewportSize(TABLET);
    await signIn(page, CEO, "/admin");
    await expect(page.getByRole("heading", { name: /the studio, in view/i })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await shot(page, "21-tablet-dashboard");
  });
});

test.describe("Phase 5 — the client's side", () => {
  test("22 the client portal shows that client's work and no one else's", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signOutViaStorage(page);
    await signIn(page, GREEN_BASKET_CLIENT, "/portal");

    await expect(page).toHaveURL(/\/portal/);
    await expect(page.getByText(/Green Basket/).first()).toBeVisible();
    await expect(page.getByText(GREEN_BASKET_PROJECT)).toBeVisible();

    // Data isolation: another studio client must not appear.
    const body = await page.locator("body").innerText();
    expect(body, "another client's project leaked into this portal").not.toContain("Urban Thread");
    expect(body).not.toContain("Saffron & Co");

    await expectNoBrokenMoney(page);
    await shot(page, "22-client-portal");
  });

  test("23 the client sees the invoice with its real total", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, GREEN_BASKET_CLIENT, "/portal");

    await expect(page.getByText("₹1,26,850").first()).toBeVisible();
    await expect(page.getByText(/BM-\d{4}-/).first()).toBeVisible();
    await shot(page, "23-client-invoice", false);
  });

  test("24 a client account is refused the CEO workspace", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, GREEN_BASKET_CLIENT, "/portal");
    await page.goto("/admin");

    await expect(page.getByText(/You are signed in\./)).toBeVisible();
    await expect(page.getByRole("button", { name: /open client portal/i })).toBeVisible();
    await shot(page, "24-client-refused-admin");
  });

  test("25 an account with no client record is told so plainly", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signOutViaStorage(page);
    await signIn(page, NO_RECORD_ACCOUNT, "/portal");

    await expect(page.locator("body")).toContainText(/no client|not.*match|access/i);
    await shot(page, "25-no-client-record");
  });

  test("26 the portal on a phone", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page, GREEN_BASKET_CLIENT, "/portal");
    await expect(page.getByText(GREEN_BASKET_PROJECT)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await shot(page, "26-mobile-client-portal");
  });
});

test.describe("Whole-surface checks", () => {
  test("27 every admin route renders without a console error", async ({ page }) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("pageerror", (error) => pageErrors.push(String(error)));
    // Request failures are recorded by URL rather than by console text, because
    // "Failed to load resource" on its own cannot be told apart from a blocked
    // third-party font. Only this origin's requests are the application's
    // responsibility; the container has no outbound access to Google Fonts.
    page.on("requestfailed", (request) => {
      const url = request.url();
      const reason = request.failure()?.errorText ?? "unknown";
      // ERR_ABORTED is the browser cancelling a request that was still in
      // flight when the page navigated — this test walks four routes in a row,
      // so a pending auth.me is routinely cancelled. That is the browser doing
      // its job, not a resource the application failed to serve.
      if (url.startsWith("http://localhost:3000") && reason !== "net::ERR_ABORTED") {
        failedRequests.push(`${url} — ${reason}`);
      }
    });

    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");
    for (const route of ["/admin", "/operations", "/deliverables", "/onboarding"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expectNoBrokenMoney(page);
    }
    await shot(page, "27-deliverables");

    const real = pageErrors.filter((message) => !/vite|hmr|ResizeObserver/i.test(message));
    expect(real, `uncaught page errors: ${real.join(" | ")}`).toHaveLength(0);
    expect(failedRequests, `same-origin requests failed: ${failedRequests.join(" | ")}`).toHaveLength(0);
  });

  test("28 keyboard navigation reaches the controls", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page, CEO, "/admin");

    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 40)}` : "none";
    });
    expect(focused).not.toBe("none");
    expect(focused).not.toBe("BODY:");
    await shot(page, "28-keyboard-focus", false);
  });
});

/**
 * Resolves the Green Basket project's URL from the operations project list.
 *
 * Not from the dashboard pipeline: on a phone that shows one stage at a time,
 * so the card is only in the DOM when its stage happens to be selected. The
 * operations list renders every project at every viewport.
 */
async function projectUrl(page: Page) {
  await page.goto("/operations");
  const row = page.locator("article", { hasText: GREEN_BASKET_PROJECT }).first();
  const href = await row.getByRole("link", { name: /Open project/ }).getAttribute("href");
  if (!href) throw new Error("The Green Basket project row has no link");
  return href;
}
