export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { startFirebaseLogin } from "@/lib/firebase";

// Start Firebase Google sign-in only from a user gesture or explicit effect.
// This function opens the provider popup; it never embeds account details or
// administrative credentials in the client bundle.
export const startLogin = () => startFirebaseLogin();
