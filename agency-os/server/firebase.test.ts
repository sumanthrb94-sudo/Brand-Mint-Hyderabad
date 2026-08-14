import { describe, expect, it } from "vitest";
import { firebaseUserFromToken, makeNumericId, normalizeFirebasePrivateKey } from "./firebase";

describe("Firebase serverless foundations", () => {
  it("creates safe numeric record identifiers compatible with existing Agency OS route contracts", () => {
    const identifiers = Array.from({ length: 20 }, () => makeNumericId());
    expect(identifiers.every((identifier) => Number.isSafeInteger(identifier))).toBe(true);
    expect(new Set(identifiers).size).toBeGreaterThan(1);
  });

  it("derives an allowlisted CEO profile from a verified Firebase token without requiring Firestore persistence", () => {
    const previous = process.env.FIREBASE_ADMIN_EMAILS;
    process.env.FIREBASE_ADMIN_EMAILS = "sumanthbolla97@gmail.com";

    const user = firebaseUserFromToken({
      uid: "firebase-ceo",
      email: "sumanthbolla97@gmail.com",
      name: "Brand Mint CEO",
    } as Parameters<typeof firebaseUserFromToken>[0]);

    expect(user).toMatchObject({
      openId: "firebase-ceo",
      email: "sumanthbolla97@gmail.com",
      role: "admin",
      loginMethod: "firebase",
    });
    process.env.FIREBASE_ADMIN_EMAILS = previous;
  });

  it("normalizes a Vercel-escaped PEM value before Firebase Admin parses it", () => {
    const key = normalizeFirebasePrivateKey('"-----BEGIN PRIVATE KEY-----\\nkey-body\\n-----END PRIVATE KEY-----\\n"');

    expect(key).toBe("-----BEGIN PRIVATE KEY-----\nkey-body\n-----END PRIVATE KEY-----");
  });

  it("retains a complete PEM when it is already newline-delimited", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nkey-body\n-----END PRIVATE KEY-----";

    expect(normalizeFirebasePrivateKey(pem)).toBe(pem);
  });
});
