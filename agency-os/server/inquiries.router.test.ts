import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { publicInquirySchema } from "./routers/inquiries";

describe("inquiries.submit", () => {
  it("accepts a complete anonymous project request", () => {
    const input = publicInquirySchema.parse({
      name: "Prospective Client",
      companyName: "Example Commerce",
      email: "lead@example.com",
      request: "We need a conversion-focused ecommerce store for our catalogue.",
    });
    expect(input.companyName).toBe("Example Commerce");
  });

  it("rejects a request without sufficient project context", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    await expect(caller.inquiries.submit({ name: "Lead", companyName: "Company", email: "lead@example.com", request: "Short" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
