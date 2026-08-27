import type { OnboardingInput, ProjectRecord } from "./firebaseAgencyDb.js";

export const ECOMMERCE_TIER_PRICING = {
  starter_store: { label: "Starter Store", amountPaise: 9_900_000 },
  growth_store: { label: "Growth Store", amountPaise: 20_000_000 },
  commerce_store: { label: "Commerce Store", amountPaise: 30_000_000 },
} as const;

export function onboardingProjectDraft({ clientId, companyName, serviceTier }: Pick<OnboardingInput, "companyName" | "serviceTier"> & { clientId: number }) {
  const tier = ECOMMERCE_TIER_PRICING[serviceTier];
  return {
    clientId,
    title: `${companyName.trim()} — ${tier.label}`,
    status: "discovery" as const,
    deadline: null,
    assignedTo: null,
    pricingMode: "package" as const,
    basePricePaise: tier.amountPaise,
    finalPricePaise: null,
  };
}

export function projectPricePaise(project: Pick<ProjectRecord, "pricingMode" | "basePricePaise" | "finalPricePaise">) {
  if (project.pricingMode === "personal" && typeof project.finalPricePaise === "number") return project.finalPricePaise;
  return project.basePricePaise ?? null;
}

export function canAdjustFinalPrice(project: Pick<ProjectRecord, "pricingMode">) {
  return project.pricingMode === "personal";
}
