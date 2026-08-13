import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

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

export async function startFirebaseLogin() {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase authentication is not configured for this deployment");
  return signInWithPopup(auth, new GoogleAuthProvider());
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
