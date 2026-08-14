import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * End-to-end journey simulation — visitor to paid client, both sides.
 *
 * This drives the real tRPC routers, the real authorization middleware, the
 * real pricing and invoice-total maths and the real PDF generator. Only
 * Firestore and Cloud Storage are replaced, by the in-memory doubles below,
 * so what passes here is what the deployed API does.
 *
 * Run it on its own to read the journey as a narrative:
 *   pnpm vitest run server/journey.simulation.test.ts
 */

// ---------------------------------------------------------------- doubles --

const store = new Map<string, Map<string, Record<string, unknown>>>();
const collection = (name: string) => {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
};

const firestoreDouble = {
  collection: (name: string) => ({
    get: async () => ({
      docs: [...collection(name).entries()].map(([id, data]) => ({ id, data: () => data })),
    }),
    doc: (id: string) => ({
      get: async () => ({ id, data: () => collection(name).get(id) }),
      set: async (value: Record<string, unknown>, options?: { merge?: boolean }) => {
        const previous = options?.merge ? (collection(name).get(id) ?? {}) : {};
        collection(name).set(id, { ...previous, ...value });
      },
    }),
  }),
};

const storedObjects = new Map<string, { bytes: number; contentType: string }>();
const storageDouble = {
  file: (key: string) => ({
    save: async (contents: Buffer, options: { contentType: string }) => {
      storedObjects.set(key, { bytes: contents.byteLength, contentType: options.contentType });
    },
    getSignedUrl: async () => [`https://storage.test/${encodeURIComponent(key)}`],
  }),
};

vi.mock("./firebase.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./firebase.js")>()),
  firebaseDb: () => firestoreDouble,
  firebaseStorage: () => storageDouble,
}));

// ------------------------------------------------------------------ setup --

const { appRouter } = await import("./routers.js");
const { firebaseUserFromToken, OWNER_EMAIL } = await import("./firebase.js");
const { ECOMMERCE_TIER_PRICING } = await import("./projectPricing.js");
type TrpcContext = import("./_core/context.js").TrpcContext;

/** A caller carrying the profile the server derives from a real Google token. */
function callerFor(uid: string, email: string, name: string) {
  const user = firebaseUserFromToken({ uid, email, name, email_verified: true } as never);
  return { caller: appRouter.createCaller({ user } as TrpcContext), user };
}

const anonymous = appRouter.createCaller({ user: null } as TrpcContext);

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const log: string[] = [];
const step = (actor: string, line: string) => log.push(`  ${actor.padEnd(9)} │ ${line}`);

const DAY = 86_400_000;
const fixedNow = 1_786_720_000_000;

describe("Brand Mint journey — visitor to paid client", () => {
  let ceo: ReturnType<typeof callerFor>;

  beforeAll(() => {
    process.env.FIREBASE_ADMIN_EMAILS = OWNER_EMAIL;
    ceo = callerFor("uid-ceo", OWNER_EMAIL, "Brand Mint CEO");
  });

  // ---------------------------------------------------------- 1. the lead --

  it("captures anonymous project requests and lands them in the CEO inbox", async () => {
    const visitors = [
      { name: "Aditya Rao", companyName: "Kesari Silks", email: "aditya@kesarisilks.in", request: "We sell sarees in three Hyderabad stores and want to go online. Around 400 SKUs, need COD." },
      { name: "Nadia Fernandes", companyName: "Bombay Baked", email: "nadia@bombaybaked.com", request: "A bakery doing Instagram orders on WhatsApp. We need a real cart and same-day delivery slots." },
      { name: "Vikram Shetty", companyName: "Trailhead Gear", email: "vikram@trailheadgear.in", request: "Outdoor equipment, 1200 SKUs, we already have a Razorpay account and a courier contract." },
    ];

    for (const visitor of visitors) {
      // No account, no sign-in — this is the public homepage form.
      const result = await anonymous.inquiries.submit(visitor);
      expect(result.success).toBe(true);
      step("visitor", `${visitor.name} (${visitor.companyName}) sends a request — no account needed`);
    }

    const inbox = await ceo.caller.dashboard.overview();
    expect(inbox.inquiries).toHaveLength(3);
    expect(inbox.inquiries.every((inquiry) => inquiry.status === "new")).toBe(true);
    step("CEO", `inbox shows ${inbox.inquiries.length} new requests in real time`);

    // Each request also raises an admin notification.
    expect(inbox.notifications.filter((n) => n.notificationType === "public_inquiry")).toHaveLength(3);
    step("CEO", `${inbox.notifications.length} admin notifications raised`);
  });

  it("keeps the lead inbox private to the CEO", async () => {
    await expect(anonymous.dashboard.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const stranger = callerFor("uid-stranger", "stranger@example.com", "Stranger");
    await expect(stranger.caller.dashboard.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    step("guard", "anonymous → UNAUTHORIZED, signed-in non-owner → FORBIDDEN");
  });

  // --------------------------------------------- 2. what makes them a client --

  it("refuses onboarding until every required policy is accepted", async () => {
    await expect(anonymous.onboarding.submit({
      name: "Aditya Rao", companyName: "Kesari Silks", email: "aditya@kesarisilks.in",
      serviceType: "ecommerce", serviceTier: "growth_store",
      projectBrief: "Sarees online, 400 SKUs, COD required.",
      acceptedPolicies: ["terms", "privacy", "cookies"], // service_agreement missing
    } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    step("gate", "3 of 4 policies accepted → rejected. All four is what creates a client.");
  });

  it("converts a lead into a client record with a priced project", async () => {
    const onboarded = await anonymous.onboarding.submit({
      name: "Aditya Rao", companyName: "Kesari Silks", email: "aditya@kesarisilks.in",
      phone: "+91 98490 00000",
      serviceType: "ecommerce", serviceTier: "growth_store",
      selectedAddons: ["android_app"],
      preferredTimeline: "Before Diwali",
      projectBrief: "400 saree SKUs across three stores. COD plus Razorpay. Courier integration needed.",
      acceptedPolicies: ["terms", "privacy", "cookies", "service_agreement"],
    });
    expect(onboarded.success).toBe(true);
    step("visitor", "Aditya completes onboarding — tier, brief, add-ons, all four policies");

    const clients = await ceo.caller.clients.list();
    const kesari = clients.find((client) => client.companyName === "Kesari Silks");
    expect(kesari).toBeDefined();

    const projects = await ceo.caller.projects.list();
    const project = projects.find((entry) => entry.project.clientId === kesari!.id);
    expect(project?.project.status).toBe("discovery");
    expect(project?.project.basePricePaise).toBe(ECOMMERCE_TIER_PRICING.growth_store.amountPaise);
    step("system", `client + contact + project created, priced at ${rupees(project!.project.basePricePaise!)} (Growth Store)`);
  });

  // ------------------------------------------- 3. the client signs in via Google --

  it("opens the portal to the onboarded client and refuses everyone else", async () => {
    // The Google account email must match the onboarded contact email.
    const aditya = callerFor("uid-aditya", "aditya@kesarisilks.in", "Aditya Rao");
    expect(aditya.user.role).toBe("user");

    const portal = await aditya.caller.portal.overview();
    expect(portal.projects).toHaveLength(1);
    expect(portal.projects[0]!.status).toBe("discovery");
    step("client", `Aditya signs in with Google → portal shows "${portal.projects[0]!.title}" (discovery)`);

    // A Google account with no onboarding record gets nothing.
    const passerby = callerFor("uid-passerby", "someone@gmail.com", "Passer By");
    await expect(passerby.caller.portal.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    step("guard", "Google account with no onboarding record → FORBIDDEN, sees only the public/member pages");

    // And the owner is routed away from the client portal entirely.
    await expect(ceo.caller.portal.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    step("guard", "owner account → refused the client portal, belongs in Agency OS");
  });

  // ------------------------------------------------ 4. delivery, admin side --

  it("drives the project through the pipeline with deliverables the client can see", async () => {
    const projects = await ceo.caller.projects.list();
    const project = projects.find((entry) => entry.clientName === "Kesari Silks")!.project;

    for (const title of ["Catalogue import — 400 SKUs", "Razorpay + COD checkout", "Courier API and tracking"]) {
      await ceo.caller.projects.addDeliverable({ projectId: project.id, title, dueAt: fixedNow + 21 * DAY });
    }
    await ceo.caller.projects.setStatus({ id: project.id, status: "in_progress" });
    step("CEO", "3 deliverables added, project moved discovery → in_progress");

    const aditya = callerFor("uid-aditya", "aditya@kesarisilks.in", "Aditya Rao");
    const portal = await aditya.caller.portal.overview();
    expect(portal.projects[0]!.status).toBe("in_progress");
    step("client", "portal reflects in_progress on the client's next load");

    await ceo.caller.projects.setStatus({ id: project.id, status: "client_review" });
    const refreshed = await aditya.caller.portal.overview();
    expect(refreshed.projects[0]!.status).toBe("client_review");
    step("client", "portal reflects client_review — this is the live project-update channel");
  });

  // -------------------------------------------------- 5. invoice and payment --

  it("issues an itemised invoice with 18% GST, a stored PDF and a client notification", async () => {
    const clients = await ceo.caller.clients.list();
    const kesari = clients.find((client) => client.companyName === "Kesari Silks")!;

    const invoice = await ceo.caller.invoices.create({
      clientId: kesari.id,
      dueAt: fixedNow + 7 * DAY,
      gstPercent: 18,
      items: [
        { description: "Growth Store build", quantity: 1, unitAmountPaise: ECOMMERCE_TIER_PRICING.growth_store.amountPaise },
        { description: "Android app add-on", quantity: 1, unitAmountPaise: 5_000_000 },
      ],
    });
    expect(invoice.success).toBe(true);
    // nanoid's alphabet includes "-" and "_", so an uppercased suffix is not
    // strictly alphanumeric.
    expect(invoice.invoiceNumber).toMatch(/^BM-\d{4}-[A-Z0-9_-]{8}$/);

    const overview = await ceo.caller.dashboard.overview();
    const issued = overview.invoices.find((entry) => entry.id === invoice.invoiceId)!;
    // ₹2,00,000 build + ₹50,000 add-on = ₹2,50,000 + 18% GST = ₹2,95,000
    expect(issued.subtotalPaise).toBe(25_000_000);
    expect(issued.gstPaise).toBe(4_500_000);
    expect(issued.totalPaise).toBe(29_500_000);
    step("CEO", `invoice ${invoice.invoiceNumber}: ${rupees(issued.subtotalPaise)} + GST ${rupees(issued.gstPaise)} = ${rupees(issued.totalPaise)}`);

    // A real PDF was rendered and stored, and the client can fetch it.
    const stored = [...storedObjects.entries()].find(([key]) => key.includes(invoice.invoiceNumber))!;
    expect(stored[1].contentType).toBe("application/pdf");
    expect(stored[1].bytes).toBeGreaterThan(100);
    step("system", `invoice PDF rendered (${stored[1].bytes} bytes) and stored`);

    const aditya = callerFor("uid-aditya", "aditya@kesarisilks.in", "Aditya Rao");
    const portal = await aditya.caller.portal.overview();
    expect(portal.invoices).toHaveLength(1);
    expect(portal.files.some((file) => file.fileKind === "invoice_pdf")).toBe(true);
    const download = await aditya.caller.files.download({ id: portal.files.find((f) => f.fileKind === "invoice_pdf")!.id });
    expect(download.url).toContain("https://storage.test/");
    step("client", "invoice and downloadable PDF visible in the portal");
  });

  it("records payment and rolls it into CEO revenue", async () => {
    const clients = await ceo.caller.clients.list();
    const kesari = clients.find((client) => client.companyName === "Kesari Silks")!;
    const before = await ceo.caller.dashboard.overview();
    const invoice = before.invoices.find((entry) => entry.clientId === kesari.id)!;
    expect(before.metrics.revenuePaise).toBe(0);
    expect(before.metrics.pendingInvoices).toBe(1);

    await ceo.caller.invoices.setPaymentStatus({ id: invoice.id, clientId: kesari.id, status: "paid" });

    const after = await ceo.caller.dashboard.overview();
    expect(after.metrics.revenuePaise).toBe(29_500_000);
    expect(after.metrics.pendingInvoices).toBe(0);
    // Payment is what promotes the record from lead to active.
    expect(after.metrics.activeClients).toBe(1);
    step("CEO", `payment recorded → revenue ${rupees(after.metrics.revenuePaise)}, pending 0, active clients ${after.metrics.activeClients}`);
  });

  // ------------------------------- 6. CEO price override for a self-funded build --

  it("lets the CEO cut the price on a self-funded project, and blocks it on a package one", async () => {
    const clients = await ceo.caller.clients.list();
    const kesari = clients.find((client) => client.companyName === "Kesari Silks")!;

    // A self-funded / personal build starts from the Starter list price.
    const listPrice = ECOMMERCE_TIER_PRICING.starter_store.amountPaise;
    const created = await ceo.caller.projects.create({
      clientId: kesari.id,
      title: "Kesari Silks — self-funded pilot store",
      pricingMode: "personal",
      basePricePaise: listPrice,
    });
    const discounted = 6_000_000; // ₹60,000
    await ceo.caller.projects.setFinalPrice({ id: created.projectId, finalPricePaise: discounted });
    step("CEO", `self-funded project repriced ${rupees(listPrice)} → ${rupees(discounted)}`);

    const aditya = callerFor("uid-aditya", "aditya@kesarisilks.in", "Aditya Rao");
    const portal = await aditya.caller.portal.overview();
    const pilot = portal.projects.find((project) => project.id === created.projectId)!;
    expect(pilot.finalPricePaise).toBe(discounted);
    step("client", `client sees the agreed ${rupees(pilot.finalPricePaise!)}, not the list price`);

    // The override cannot be used to quietly discount a fixed-price package.
    const packaged = await ceo.caller.projects.create({ clientId: kesari.id, title: "Packaged build", pricingMode: "package", basePricePaise: listPrice });
    await expect(ceo.caller.projects.setFinalPrice({ id: packaged.projectId, finalPricePaise: 1 })).rejects.toThrow(/only for personal projects/);
    step("guard", "same override on a package project → refused");
  });

  // ------------------------------------------------------------ the report --

  it("prints the journey and what is still missing", async () => {
    console.log(["", "  BRAND MINT — END-TO-END JOURNEY", "  " + "─".repeat(74), ...log, "  " + "─".repeat(74)].join("\n"));

    console.log([
      "  STILL MISSING — needs a decision or credentials, not just code",
      "  1. Razorpay collects nothing. The public copy promises online payments and COD,",
      "     and invoices/PDFs are real, but invoices.setPaymentStatus is a manual CEO",
      "     toggle. No order creation, no checkout, no webhook reconciliation. Wiring it",
      "     needs live keys and an explicit go-ahead — it moves real money.",
      "  2. Portal access is granted on email match alone (bindEligibleClientUser), so",
      "     whoever controls that Google address inherits the client's records. Fine for",
      "     a studio with a handful of clients; worth revisiting before it scales.",
      "  3. Nothing expires or revokes a client binding once made.",
      "",
    ].join("\n"));
  });
});
