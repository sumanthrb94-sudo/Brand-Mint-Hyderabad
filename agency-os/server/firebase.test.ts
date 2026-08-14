import { describe, expect, it } from "vitest";
import { adminAllowlist, firebaseUserFromToken, isConfiguredAdmin, makeNumericId, normalizeFirebasePrivateKey, OWNER_EMAIL } from "./firebase";

// `process.env.X = undefined` stores the string "undefined" and leaks into
// every later test, so an absent value has to be restored by deleting the key.
function restoreAdminEmails(previous: string | undefined) {
  if (previous === undefined) delete process.env.FIREBASE_ADMIN_EMAILS;
  else process.env.FIREBASE_ADMIN_EMAILS = previous;
}

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
    restoreAdminEmails(previous);
  });

  it("refuses admin to every account that is not on the allowlist", () => {
    const previous = process.env.FIREBASE_ADMIN_EMAILS;
    process.env.FIREBASE_ADMIN_EMAILS = "sumanthbolla97@gmail.com";

    for (const email of ["someone.else@gmail.com", "sumanthrb94@gmail.com", "mintstudios823@gmail.com", "sumanthbolla97@gmail.com.attacker.com", "attacker+sumanthbolla97@gmail.com"]) {
      const user = firebaseUserFromToken({ uid: `uid-${email}`, email, email_verified: true } as Parameters<typeof firebaseUserFromToken>[0]);
      expect(user.role, `${email} must not be admin`).toBe("user");
    }

    restoreAdminEmails(previous);
  });

  it("matches the owner regardless of case or surrounding whitespace", () => {
    expect(adminAllowlist("  SumanthBolla97@Gmail.com , ")).toEqual(["sumanthbolla97@gmail.com"]);
    expect(isConfiguredAdmin("SUMANTHBOLLA97@gmail.com", true)).toBe(true);
  });

  it("falls back to the owner rather than no owner when the variable is blank", () => {
    expect(adminAllowlist(undefined)).toEqual([OWNER_EMAIL]);
    expect(adminAllowlist("")).toEqual([OWNER_EMAIL]);
    expect(adminAllowlist("  ,  ")).toEqual([OWNER_EMAIL]);
  });

  it("refuses admin on an unverified email", () => {
    const previous = process.env.FIREBASE_ADMIN_EMAILS;
    process.env.FIREBASE_ADMIN_EMAILS = OWNER_EMAIL;

    expect(isConfiguredAdmin(OWNER_EMAIL, false)).toBe(false);
    expect(isConfiguredAdmin(OWNER_EMAIL, true)).toBe(true);
    expect(isConfiguredAdmin(null, true)).toBe(false);

    restoreAdminEmails(previous);
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
