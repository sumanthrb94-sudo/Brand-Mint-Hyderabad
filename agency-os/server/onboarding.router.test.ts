import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("onboarding.submit", () => {
  it("rejects an onboarding request that does not include all four required legal acceptances", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);

    await expect(caller.onboarding.submit({
      name: "Client Contact",
      companyName: "Client Company",
      email: "client@example.com",
      serviceType: "website",
      projectBrief: "A valid project brief.",
      acceptedPolicies: ["terms", "privacy", "cookies"],
    } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
