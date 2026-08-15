/**
 * The Google accounts the simulation signs in as.
 *
 * Deliberately free of any import from `./firebase.js` — that module imports
 * this one, and a cycle would leave the constants undefined at evaluation time.
 * `assertSimulationAdminMatchesOwner()` in `./seed.ts` checks the admin address
 * against OWNER_EMAIL at boot so the two cannot drift apart silently.
 */

export type SimulationAccount = {
  uid: string;
  email: string;
  name: string;
  /** What this account is for, shown on the simulation sign-in screen. */
  role: "CEO" | "Client";
  company?: string;
};

export const SIMULATION_ACCOUNTS: SimulationAccount[] = [
  { uid: "sim-uid-ceo", email: "sumanthbolla97@gmail.com", name: "Sumanth Bolla", role: "CEO" },
  { uid: "sim-uid-greenbasket", email: "rajesh@greenbasket.com", name: "Rajesh Kumar", role: "Client", company: "Green Basket" },
  { uid: "sim-uid-urbanthread", email: "priya@urbanthread.in", name: "Priya Menon", role: "Client", company: "Urban Thread" },
  { uid: "sim-uid-visitor", email: "ananya.iyer.blr@gmail.com", name: "Ananya Iyer", role: "Client", company: "No client record — shows the refusal screen" },
  // Has no client record until the write-path run onboards one through the
  // form, which is what lets that run sign in as a client it created itself.
  { uid: "sim-uid-nilgiri", email: "lakshmi@nilgiritearoom.in", name: "Lakshmi Rao", role: "Client", company: "Nilgiri Tea Room" },
];

export const SIMULATION_TOKEN_PREFIX = "sim:";

export function simulationEnabled() {
  // Never in production, and never without the explicit opt-in. Both conditions
  // are checked at every call site rather than cached, so a misconfigured
  // deployment cannot inherit a simulated database from module-load order.
  return process.env.SIMULATION_MODE === "1" && process.env.NODE_ENV !== "production";
}

export function simulationAccountFor(email: string) {
  const normalized = email.trim().toLowerCase();
  return SIMULATION_ACCOUNTS.find((account) => account.email.toLowerCase() === normalized) ?? null;
}

/**
 * Turns `sim:<email>` into the same claim set a verified Google ID token
 * carries, so `firebaseUserFromToken` applies the real admin allowlist to it and
 * the CEO/client split is decided by production logic rather than by the
 * simulation.
 */
export function simulationClaimsFromToken(token: string) {
  if (!token.startsWith(SIMULATION_TOKEN_PREFIX)) return null;
  const email = token.slice(SIMULATION_TOKEN_PREFIX.length).trim().toLowerCase();
  if (!email) return null;
  const account = simulationAccountFor(email);
  return {
    uid: account?.uid ?? `sim-uid-${email.replace(/[^a-z0-9]/g, "-")}`,
    email,
    name: account?.name ?? email,
    email_verified: true,
  };
}
