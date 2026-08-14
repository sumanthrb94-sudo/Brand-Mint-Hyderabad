import { describe, expect, it } from "vitest";
import { destinationForRole } from "./roleRoutes";

describe("destinationForRole", () => {
  it("keeps an approved admin on the requested internal destination", () => {
    expect(destinationForRole("admin", "/operations")).toBe("/operations");
  });

  it("sends non-admin accounts to the existing client portal", () => {
    expect(destinationForRole("client")).toBe("/portal");
    expect(destinationForRole("user")).toBe("/portal");
    expect(destinationForRole(null)).toBe("/portal");
  });

  it("uses the one shared sign-in default to route the CEO to Agency OS", () => {
    expect(destinationForRole("admin")).toBe("/admin");
    expect(destinationForRole(undefined)).toBe("/portal");
  });
});
