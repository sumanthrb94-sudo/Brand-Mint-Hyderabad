import { describe, expect, it } from "vitest";
import { firebaseAuthErrorMessage, safeReturnPath } from "./firebase";

describe("safeReturnPath", () => {
  it("keeps valid internal workspace destinations", () => {
    expect(safeReturnPath("/admin")).toBe("/admin");
    expect(safeReturnPath("/portal?tab=files")).toBe("/portal?tab=files");
  });

  it("rejects external, empty, and recursive sign-in destinations", () => {
    expect(safeReturnPath("https://example.com")).toBe("/admin");
    expect(safeReturnPath("//example.com")).toBe("/admin");
    expect(safeReturnPath("/sign-in?returnTo=/admin")).toBe("/admin");
    expect(safeReturnPath(null)).toBe("/admin");
  });
});

describe("firebaseAuthErrorMessage", () => {
  it("gives a specific recovery step when Firebase has blocked an SMS region", () => {
    expect(firebaseAuthErrorMessage({ code: "auth/operation-not-allowed" })).toContain("SMS region policy");
    expect(firebaseAuthErrorMessage({ code: "auth/operation-not-allowed" })).toContain("India (+91)");
  });

  it("preserves ordinary authentication errors", () => {
    expect(firebaseAuthErrorMessage(new Error("Google sign-in was cancelled"))).toBe("Google sign-in was cancelled");
  });
});
