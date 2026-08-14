import { describe, expect, it } from "vitest";
import { canAdjustFinalPrice, onboardingProjectDraft, projectPricePaise } from "./projectPricing";

describe("project pricing", () => {
  it("creates an immediately visible fixed-price project for completed ecommerce onboarding", () => {
    const project = onboardingProjectDraft({ clientId: 42, companyName: "Northstar", serviceTier: "starter_store" });

    expect(project).toMatchObject({
      clientId: 42,
      title: "Northstar — Starter Store",
      status: "discovery",
      pricingMode: "package",
      basePricePaise: 9_900_000,
    });
  });

  it("allows final-price adjustment only for personal projects and selects the final amount", () => {
    const personal = { pricingMode: "personal" as const, basePricePaise: null, finalPricePaise: 125_000_00 };
    const packaged = { pricingMode: "package" as const, basePricePaise: 20_000_000, finalPricePaise: null };

    expect(canAdjustFinalPrice(personal)).toBe(true);
    expect(projectPricePaise(personal)).toBe(125_000_00);
    expect(canAdjustFinalPrice(packaged)).toBe(false);
    expect(projectPricePaise(packaged)).toBe(20_000_000);
  });
});
