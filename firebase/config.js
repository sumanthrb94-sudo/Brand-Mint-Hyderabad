/**
 * Firebase web app config — filled by scripts/setup-firebase.mjs.
 *
 * None of this is secret. `apiKey` is a project identifier, not a
 * credential — it authorises nothing on its own. Google publishes it in every
 * Firebase web app. `firestore.rules` is the security boundary.
 *
 * What must NEVER go in this file, or anywhere in this repo: an Admin SDK
 * service-account JSON. Everything here is served to the browser, so a
 * service-account key placed here would be published on your Vercel URL.
 * .gitignore refuses those files; keep it that way.
 *
 * To refresh these values, or after rotating the API key:
 *   node scripts/setup-firebase.mjs --key <service-account.json>
 */

export const firebaseConfig = {
  apiKey: "AIzaSyBk1rF-GagRY_XIXfXdXq2ndXfI0hZc2KI",
  authDomain: "brandmintstudios-a5eb7.firebaseapp.com",
  projectId: "brandmintstudios-a5eb7",
  // If the console shows "...appspot.com" instead, use that — older projects
  // use the legacy bucket name and the two are not interchangeable.
  storageBucket: "brandmintstudios-a5eb7.firebasestorage.app",
  messagingSenderId: "347410314571",
  appId: "1:347410314571:web:ca05f839b43bec5f1a64ce",
};

/** Pinned in one place so bumping the SDK is a one-line change. */
export const FIREBASE_SDK_VERSION = "10.13.0";

/** True once the placeholders have actually been replaced. */
export function isConfigured() {
  return !Object.values(firebaseConfig).some(
    (v) => typeof v === "string" && v.startsWith("PASTE_")
  );
}
