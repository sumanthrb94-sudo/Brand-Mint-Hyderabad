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
  it("gives a specific recovery step for an account with a different Firebase credential", () => {
    expect(firebaseAuthErrorMessage({ code: "auth/account-exists-with-different-credential" })).toContain("another sign-in method");
  });

  it("preserves ordinary authentication errors", () => {
    expect(firebaseAuthErrorMessage(new Error("Google sign-in was cancelled"))).toBe("Google sign-in was cancelled");
  });
});
