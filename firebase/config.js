/**
 * Firebase web app config.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  THREE VALUES BELOW ARE PLACEHOLDERS. Paste the real ones in.        │
 * │                                                                      │
 * │  Firebase Console → ⚙ Project settings → General → Your apps         │
 * │    → Web app (</> icon if you haven't registered one) →              │
 * │      "SDK setup and configuration" → Config                          │
 * │                                                                      │
 * │  Copy apiKey, messagingSenderId and appId across. The other three    │
 * │  are already correct for brandmintstudios-a5eb7.                     │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * None of this is secret. `apiKey` is a project identifier, not a
 * credential — it authorises nothing on its own, exactly like the Supabase
 * anon key it replaces. Google publishes it in every Firebase web app.
 * `firestore.rules` is the security boundary.
 *
 * What must NEVER go in this file, or anywhere in this repo: an Admin SDK
 * service-account JSON. Everything here is served to the browser, so a
 * service-account key placed here would be published on your Vercel URL.
 */

export const firebaseConfig = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "brandmintstudios-a5eb7.firebaseapp.com",
  projectId: "brandmintstudios-a5eb7",
  // If the console shows "...appspot.com" instead, use that — older projects
  // use the legacy bucket name and the two are not interchangeable.
  storageBucket: "brandmintstudios-a5eb7.firebasestorage.app",
  messagingSenderId: "PASTE_SENDER_ID_HERE",
  appId: "PASTE_APP_ID_HERE",
};

/** Pinned in one place so bumping the SDK is a one-line change. */
export const FIREBASE_SDK_VERSION = "10.13.0";

/** True once the placeholders have actually been replaced. */
export function isConfigured() {
  return !Object.values(firebaseConfig).some(
    (v) => typeof v === "string" && v.startsWith("PASTE_")
  );
}
