import { describe, expect, it } from "vitest";
import { makeNumericId } from "./firebase";

describe("Firebase serverless foundations", () => {
  it("creates safe numeric record identifiers compatible with existing Agency OS route contracts", () => {
    const identifiers = Array.from({ length: 20 }, () => makeNumericId());
    expect(identifiers.every((identifier) => Number.isSafeInteger(identifier))).toBe(true);
    expect(new Set(identifiers).size).toBeGreaterThan(1);
  });
});
