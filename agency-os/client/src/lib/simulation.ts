/**
 * Client half of simulation mode.
 *
 * Google sign-in cannot complete in a headless container — there is no popup to
 * consent in and no Firebase project configured. When VITE_SIMULATION_MODE is
 * set, the chosen account is held in localStorage and presented to the server as
 * a `sim:<email>` bearer token, which the server exchanges for the same claim
 * set a verified Google token would carry.
 *
 * Everything downstream is untouched: the role still comes from the server's
 * admin allowlist, AdminGuard still enforces it, and the portal still refuses an
 * account with no client record.
 */

export type SimulationAccount = {
  uid: string;
  email: string;
  name: string;
  role: "CEO" | "Client";
  company?: string;
};

const ACCOUNT_KEY = "brand-mint.simulation-account";

/** Fired when the signed-in simulation account changes, so useAuth can react. */
export const SIMULATION_ACCOUNT_EVENT = "brand-mint:simulation-account";

export function simulationMode() {
  if (typeof window !== "undefined" && (window as { __BRAND_MINT_SIMULATION__?: boolean }).__BRAND_MINT_SIMULATION__) return true;
  return import.meta.env.VITE_SIMULATION_MODE === "1";
}

export function simulationAccount(): SimulationAccount | null {
  if (!simulationMode() || typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SimulationAccount;
    return parsed.uid && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function setSimulationAccount(account: SimulationAccount) {
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  window.dispatchEvent(new Event(SIMULATION_ACCOUNT_EVENT));
}

export function clearSimulationAccount() {
  window.localStorage.removeItem(ACCOUNT_KEY);
  window.dispatchEvent(new Event(SIMULATION_ACCOUNT_EVENT));
}

export async function fetchSimulationAccounts(): Promise<SimulationAccount[]> {
  const response = await fetch("/api/simulation/accounts");
  if (!response.ok) throw new Error("The simulation account list could not be loaded");
  const payload = (await response.json()) as { accounts: SimulationAccount[] };
  return payload.accounts;
}
