/**
 * Seeds the simulated database by driving the real tRPC routers.
 *
 * Nothing here writes a record by hand. Every client, project, checklist,
 * invoice and notification below is produced by the same procedure the CEO's
 * own clicks would call, which is what makes the screenshots taken against this
 * data screenshots of the product rather than of a fixture file.
 *
 * The headline engagement is Green Basket at ₹95,000. That is a personally
 * priced project, not a package one — the published Growth Store tier is
 * ₹2,00,000 (see projectPricing.ts), so a negotiated ₹95,000 build is exactly
 * the `pricingMode: "personal"` path.
 */

import { appRouter } from "../routers.js";
import { firebaseUserFromToken, OWNER_EMAIL } from "../firebase.js";
import { listClients, listProjects } from "../firebaseAgencyDb.js";
import { SIMULATION_ACCOUNTS, simulationEnabled } from "./accounts.js";
import { simulationCounts } from "./store.js";
import type { TrpcContext } from "../_core/context.js";

const RUPEE = 100;
const DAY = 86_400_000;

function callerFor(email: string) {
  const account = SIMULATION_ACCOUNTS.find((entry) => entry.email === email);
  const user = firebaseUserFromToken({
    uid: account?.uid ?? `sim-uid-${email}`,
    email,
    name: account?.name ?? email,
    email_verified: true,
  } as never);
  return appRouter.createCaller({ user } as TrpcContext);
}

/** The admin account in accounts.ts must be the account the server treats as owner. */
function assertSimulationAdminMatchesOwner() {
  const ceo = SIMULATION_ACCOUNTS.find((account) => account.role === "CEO");
  if (ceo?.email !== OWNER_EMAIL) {
    throw new Error(`Simulation CEO account (${ceo?.email}) does not match OWNER_EMAIL (${OWNER_EMAIL})`);
  }
}

async function clientIdByCompany(companyName: string) {
  const clients = await listClients();
  const match = clients.find((client) => client.companyName === companyName);
  if (!match) throw new Error(`Simulation seed could not find client "${companyName}"`);
  return match.id;
}

async function projectIdByTitle(title: string) {
  const projects = await listProjects();
  const match = projects.find((project) => project.title === title);
  if (!match) throw new Error(`Simulation seed could not find project "${title}"`);
  return match.id;
}

/** Ticks every required SOP item of one stage, the way the checkboxes do. */
async function completeRequiredItems(ceo: ReturnType<typeof callerFor>, projectId: number, stage: string) {
  const detail = await ceo.projects.detail({ id: projectId });
  const open = detail.checklist.filter((item) => item.stage === stage && item.required && !item.done);
  for (const item of open) await ceo.projects.setChecklistItem({ id: item.id, done: true });
  return open.length;
}

/** Ticks the first n optional items too, so a stage does not read as all-or-nothing. */
async function completeSomeOptionalItems(ceo: ReturnType<typeof callerFor>, projectId: number, stage: string, count: number) {
  const detail = await ceo.projects.detail({ id: projectId });
  const open = detail.checklist.filter((item) => item.stage === stage && !item.required && !item.done).slice(0, count);
  for (const item of open) await ceo.projects.setChecklistItem({ id: item.id, done: true });
}

export async function seedSimulation() {
  if (!simulationEnabled()) throw new Error("seedSimulation() called outside simulation mode");
  assertSimulationAdminMatchesOwner();

  const anonymous = appRouter.createCaller({ user: null } as TrpcContext);
  const ceo = callerFor(OWNER_EMAIL);
  const now = Date.now();

  // ---------------------------------------------------------------- leads --
  // Public project requests, exactly as the enquiry form on the marketing site
  // submits them. These populate the CEO's lead inbox.
  await anonymous.inquiries.submit({
    name: "Rajesh Kumar",
    companyName: "Green Basket",
    email: "rajesh@greenbasket.com",
    request:
      "We run an organic grocery delivery service across Hyderabad with about 400 SKUs. Our current store is slow on mobile and we lose customers at checkout. We want a full e-commerce redesign with a faster catalogue, UPI-first checkout, and a dashboard our warehouse team can actually use.",
  });
  await anonymous.inquiries.submit({
    name: "Meera Nair",
    companyName: "Clay & Co Ceramics",
    email: "meera@clayandco.in",
    request:
      "Small-batch pottery studio in Jubilee Hills. We sell through Instagram DMs right now and it does not scale. Looking for a simple store with inventory limits per piece, and a lookbook that does the work justice.",
  });
  await anonymous.inquiries.submit({
    name: "Vikram Shetty",
    companyName: "Deccan Coffee Roasters",
    email: "vikram@deccanroasters.com",
    request:
      "We roast and ship speciality coffee subscriptions. Need recurring billing, a grind-size selector on the product page, and a way to pause a subscription without emailing us. Current Shopify setup cannot do the pause flow.",
  });

  // ----------------------------------------------------------- onboarding --
  // The CEO qualifies a lead and onboards it. This creates the client record,
  // the primary contact, the four legal acceptances and the first project with
  // its SOP checklist — all inside createCompletedOnboarding.
  await anonymous.onboarding.submit({
    name: "Rajesh Kumar",
    companyName: "Green Basket",
    email: "rajesh@greenbasket.com",
    phone: "+91 98490 12345",
    serviceType: "ecommerce",
    serviceTier: "growth_store",
    selectedAddons: ["additional_payment_gateway", "extra_design_revision"],
    preferredTimeline: "8 weeks — before the Diwali season",
    projectBrief:
      "Full e-commerce redesign for an organic grocery delivery business serving Hyderabad. 400+ SKUs across fresh produce, staples and dairy. Mobile-first: 80% of orders come from phones. UPI-first checkout with COD fallback. Warehouse-facing admin dashboard for stock and route planning.",
    deliverables: "Design system, catalogue templates, checkout, admin dashboard, warehouse stock view, analytics setup",
    acceptedPolicies: ["terms", "privacy", "cookies", "service_agreement"],
  });
  await anonymous.onboarding.submit({
    name: "Priya Menon",
    companyName: "Urban Thread",
    email: "priya@urbanthread.in",
    phone: "+91 99000 45612",
    serviceType: "ecommerce",
    serviceTier: "starter_store",
    preferredTimeline: "4 weeks",
    projectBrief: "Independent apparel label moving off a marketplace onto its own storefront. 60 SKUs, size-variant heavy, needs a returns flow that does not require a phone call.",
    acceptedPolicies: ["terms", "privacy", "cookies", "service_agreement"],
  });
  await anonymous.onboarding.submit({
    name: "Arjun Reddy",
    companyName: "Saffron & Co",
    email: "arjun@saffronandco.com",
    phone: "+91 90300 77821",
    serviceType: "ecommerce",
    serviceTier: "commerce_store",
    preferredTimeline: "12 weeks",
    projectBrief: "Premium spice house exporting to the UAE and Singapore. Needs multi-currency, customs-compliant invoicing and a wholesale price tier gated behind approved accounts.",
    acceptedPolicies: ["terms", "privacy", "cookies", "service_agreement"],
  });

  const greenBasketId = await clientIdByCompany("Green Basket");
  const urbanThreadId = await clientIdByCompany("Urban Thread");
  const saffronId = await clientIdByCompany("Saffron & Co");

  // ------------------------------------------------- the ₹95,000 project --
  // Negotiated below the published Growth Store tier, so it is created as a
  // personal-pricing project — the mode whose final price the CEO can adjust.
  const GREEN_BASKET_BUILD = "Green Basket — E-Commerce Redesign";
  await ceo.projects.create({
    clientId: greenBasketId,
    title: GREEN_BASKET_BUILD,
    deadlineAt: now + 56 * DAY,
    assignedTo: "Sumanth Bolla",
    pricingMode: "personal",
    basePricePaise: 95_000 * RUPEE,
    finalPricePaise: 95_000 * RUPEE,
  });
  const buildId = await projectIdByTitle(GREEN_BASKET_BUILD);

  for (const deliverable of [
    { title: "Design system and component library", dueAt: now + 14 * DAY },
    { title: "Catalogue and product detail templates", dueAt: now + 24 * DAY },
    { title: "UPI-first checkout flow", dueAt: now + 34 * DAY },
    { title: "Warehouse admin dashboard", dueAt: now + 45 * DAY },
    { title: "Analytics and search console setup", dueAt: now + 52 * DAY },
  ]) {
    await ceo.projects.addDeliverable({ projectId: buildId, title: deliverable.title, assignedTo: "Sumanth Bolla", dueAt: deliverable.dueAt });
  }

  // Walk it through the SOP the way the checkboxes and the stepper do: required
  // items ticked, then the stage moved. setStatus refuses a forward move while
  // any required item of the current stage is open, so this only succeeds
  // because the items above it were genuinely completed first.
  await completeRequiredItems(ceo, buildId, "discovery");
  await completeSomeOptionalItems(ceo, buildId, "discovery", 3);
  await ceo.projects.setStatus({ id: buildId, status: "in_progress", force: false });

  await completeRequiredItems(ceo, buildId, "in_progress");
  await completeSomeOptionalItems(ceo, buildId, "in_progress", 2);
  await ceo.projects.setStatus({ id: buildId, status: "client_review", force: false });

  // Client review is deliberately left mid-flight: three of its five required
  // items are done. That is the state in which the stepper refuses to advance
  // and lists what is outstanding, which is the behaviour worth photographing.
  await completeSomeOptionalItems(ceo, buildId, "client_review", 2);
  const reviewDetail = await ceo.projects.detail({ id: buildId });
  const reviewRequired = reviewDetail.checklist.filter((item) => item.stage === "client_review" && item.required);
  for (const item of reviewRequired.slice(0, 3)) await ceo.projects.setChecklistItem({ id: item.id, done: true });

  // ------------------------------------------------------------- billing --
  // ₹95,000 build + ₹5,000 payment-gateway integration + ₹7,500 admin
  // dashboard = ₹1,07,500, plus 18% GST = ₹1,26,850. Totals are computed by
  // calculateInvoiceTotals and the PDF by the real generator.
  await ceo.invoices.create({
    clientId: greenBasketId,
    projectId: buildId,
    dueAt: now + 14 * DAY,
    gstPercent: 18,
    items: [
      { description: "Green Basket — E-Commerce Redesign (Growth build, negotiated)", quantity: 1, unitAmountPaise: 95_000 * RUPEE },
      { description: "Additional payment gateway integration", quantity: 1, unitAmountPaise: 5_000 * RUPEE },
      { description: "Warehouse admin dashboard", quantity: 1, unitAmountPaise: 7_500 * RUPEE },
    ],
  });

  for (const document of [
    { title: "Green Basket — Service Agreement", type: "contract" as const },
    { title: "Green Basket — Mutual NDA", type: "nda" as const },
    { title: "Green Basket — Statement of Work", type: "sow" as const },
  ]) {
    await ceo.documents.create({ clientId: greenBasketId, projectId: buildId, title: document.title, documentType: document.type });
  }
  const greenBasketDocuments = await ceo.documents.list();
  const agreement = greenBasketDocuments.find((entry) => entry.title === "Green Basket — Service Agreement");
  if (agreement) await ceo.documents.setStatus({ id: agreement.id, clientId: greenBasketId, status: "signed" });
  const nda = greenBasketDocuments.find((entry) => entry.title === "Green Basket — Mutual NDA");
  if (nda) await ceo.documents.setStatus({ id: nda.id, clientId: greenBasketId, status: "awaiting_signature" });

  // ------------------------------------------------- a completed project --
  // Urban Thread is finished and paid, so the dashboard's revenue tile and
  // active-client count have real numbers behind them rather than zeroes.
  const urbanProjectId = await projectIdByTitle("Urban Thread — Starter Store");
  await ceo.projects.addDeliverable({ projectId: urbanProjectId, title: "Storefront and size-variant templates", dueAt: now - 20 * DAY });
  await ceo.projects.addDeliverable({ projectId: urbanProjectId, title: "Self-service returns flow", dueAt: now - 10 * DAY });
  for (const stage of ["discovery", "in_progress", "client_review"]) {
    await completeRequiredItems(ceo, urbanProjectId, stage);
    const next = stage === "discovery" ? "in_progress" : stage === "in_progress" ? "client_review" : "complete";
    await ceo.projects.setStatus({ id: urbanProjectId, status: next as never, force: false });
  }
  const urbanInvoice = await ceo.invoices.create({
    clientId: urbanThreadId,
    projectId: urbanProjectId,
    dueAt: now - 3 * DAY,
    gstPercent: 18,
    items: [{ description: "Urban Thread — Starter Store build", quantity: 1, unitAmountPaise: 99_000 * RUPEE }],
  });
  await ceo.invoices.setPaymentStatus({ id: urbanInvoice.invoiceId, clientId: urbanThreadId, status: "paid" });

  // --------------------------------------------- an overridden SOP gate --
  // Saffron & Co is pushed out of discovery with required steps still open, so
  // the override path — and the admin notification that records it — is present
  // in the alerts feed rather than only in the code.
  const saffronProjectId = await projectIdByTitle("Saffron & Co — Commerce Store");
  await completeSomeOptionalItems(ceo, saffronProjectId, "discovery", 2);
  await ceo.projects.setStatus({ id: saffronProjectId, status: "in_progress", force: true });
  await ceo.projects.addDeliverable({ projectId: saffronProjectId, title: "Multi-currency pricing engine", dueAt: now + 30 * DAY });

  console.info(`[Simulation] Seeded: ${JSON.stringify(simulationCounts())}`);
  return {
    greenBasketId,
    urbanThreadId,
    saffronId,
    greenBasketProjectId: buildId,
  };
}
