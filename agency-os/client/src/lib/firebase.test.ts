import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./firebase";

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
