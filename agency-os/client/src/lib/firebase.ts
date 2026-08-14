import { getApp, getApps, initializeApp } from "firebase/app";
import {
  ConfirmationResult,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const LOGIN_RETURN_PATH_KEY = "brand-mint.login-return-path";

export function safeReturnPath(candidate?: string | null) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/sign-in")) {
    return "/admin";
  }
  return candidate;
}

export function firebaseAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/operation-not-allowed") {
    return "Phone SMS is not enabled for this country. In Firebase Console, open Authentication → Settings → SMS region policy and allow India (+91), then try again.";
  }
  if (code === "auth/too-many-requests") {
    return "Firebase has temporarily limited SMS requests for this number. Please wait before trying again, or use an approved Firebase test number during setup.";
  }
  if (error instanceof Error) return error.message;
  return "Authentication could not be completed. Please try again.";
}

export function saveLoginReturnPath(path?: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LOGIN_RETURN_PATH_KEY, safeReturnPath(path));
}

export function consumeLoginReturnPath() {
  if (typeof window === "undefined") return "/admin";
  const value = safeReturnPath(window.sessionStorage.getItem(LOGIN_RETURN_PATH_KEY));
  window.sessionStorage.removeItem(LOGIN_RETURN_PATH_KEY);
  return value;
}

function configuredFirebase() {
  const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!rawConfig) return null;
  try {
    const config = JSON.parse(rawConfig) as FirebaseConfig;
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) return null;
    return config;
  } catch {
    return null;
  }
}

export function firebaseAuth() {
  const config = configuredFirebase();
  if (!config) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function startFirebaseGoogleLogin(returnTo?: string) {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase authentication is not configured for this deployment");
  saveLoginReturnPath(returnTo);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithRedirect(auth, provider);
}

export async function finishFirebaseRedirectLogin() {
  const auth = firebaseAuth();
  if (!auth) return null;
  return getRedirectResult(auth);
}

export function createPhoneRecaptcha(containerId: string) {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase authentication is not configured for this deployment");
  return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}

export async function startFirebasePhoneLogin(phoneNumber: string, verifier: RecaptchaVerifier, returnTo?: string) {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase authentication is not configured for this deployment");
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    throw new Error("Enter a valid phone number with country code, for example +919876543210");
  }
  saveLoginReturnPath(returnTo);
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function confirmFirebasePhoneLogin(confirmation: ConfirmationResult, code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit verification code");
  return confirmation.confirm(code);
}

export async function firebaseLogout() {
  const auth = firebaseAuth();
  if (auth) await signOut(auth);
}

export async function firebaseIdToken() {
  return firebaseAuth()?.currentUser?.getIdToken() ?? null;
}

export function firebaseCurrentUser(): User | null {
  return firebaseAuth()?.currentUser ?? null;
}
