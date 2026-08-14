import { describe, expect, it } from "vitest";
import { isProfileStale, resolveSessionProfile } from "./authState";

const ceo = { id: "uid-ceo", email: "sumanthbolla97@gmail.com", role: "admin" };
const client = { id: "uid-client", email: "aditya@kesarisilks.in", role: "user" };

describe("session profile resolution", () => {
  it("honours a profile that belongs to the signed-in account", () => {
    expect(resolveSessionProfile("uid-ceo", ceo)).toBe(ceo);
    expect(resolveSessionProfile("uid-client", client)).toBe(client);
  });

  it("refuses a profile left behind by a different account", () => {
    // The exact production symptom: a client account signs in while the CEO's
    // profile is still in the shared auth.me cache. Reading it would render the
    // CEO dashboard for a client.
    expect(resolveSessionProfile("uid-client", ceo)).toBeNull();
    expect(isProfileStale("uid-client", ceo)).toBe(true);

    // And the reverse — the owner must not inherit a client's role either.
    expect(resolveSessionProfile("uid-ceo", client)).toBeNull();
  });

  it("treats a signed-out session as having no profile at all", () => {
    expect(resolveSessionProfile(null, ceo)).toBeNull();
    expect(resolveSessionProfile(undefined, ceo)).toBeNull();
    expect(resolveSessionProfile("uid-ceo", null)).toBeNull();
    expect(resolveSessionProfile("uid-ceo", undefined)).toBeNull();
  });

  it("does not report staleness when there is nothing to compare", () => {
    expect(isProfileStale(null, ceo)).toBe(false);
    expect(isProfileStale("uid-ceo", null)).toBe(false);
    expect(isProfileStale("uid-ceo", ceo)).toBe(false);
  });
});
