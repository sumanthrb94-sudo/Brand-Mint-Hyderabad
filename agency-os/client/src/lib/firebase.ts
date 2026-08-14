import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
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
  if (code === "auth/account-exists-with-different-credential") return "This email is already associated with another sign-in method for this Firebase project.";
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
  return signInWithPopup(auth, provider);
}

export async function finishFirebaseRedirectLogin() {
  const auth = firebaseAuth();
  if (!auth) return null;
  return getRedirectResult(auth);
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
