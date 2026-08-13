import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { onboardingSchema } from "./routers/onboarding";

describe("onboarding.submit", () => {
  it("accepts only a confirmed ecommerce tier and declared add-ons", () => {
    const input = onboardingSchema.parse({
      name: "Client Contact",
      companyName: "Client Company",
      email: "client@example.com",
      serviceType: "ecommerce",
      serviceTier: "growth_store",
      selectedAddons: ["android_app"],
      projectBrief: "A valid ecommerce project brief.",
      acceptedPolicies: ["terms", "privacy", "cookies", "service_agreement"],
    });

    expect(input.serviceTier).toBe("growth_store");
    expect(input.selectedAddons).toEqual(["android_app"]);
    expect(() => onboardingSchema.parse({ ...input, serviceType: "website" })).toThrow();
  });

  it("rejects an onboarding request that does not include all four required legal acceptances", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);

    await expect(caller.onboarding.submit({
      name: "Client Contact",
      companyName: "Client Company",
      email: "client@example.com",
      serviceType: "ecommerce",
      serviceTier: "starter_store",
      projectBrief: "A valid project brief.",
      acceptedPolicies: ["terms", "privacy", "cookies"],
    } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
