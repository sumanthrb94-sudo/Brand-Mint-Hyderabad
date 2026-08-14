export type AgencyRole = "admin" | "client" | "user" | null | undefined;

/**
 * Every account begins through the same Google Sign in screen. The server role
 * decides the destination after token verification; UI labels do not grant access.
 */
export function destinationForRole(role: AgencyRole, requestedPath: string = "/admin") {
  return role === "admin" ? requestedPath : "/portal";
}

export const accessCopy = {
  signedOutTitle: "Sign in to Brand Mint.",
  signedOutDetail:
    "Use your Google account to enter Brand Mint. The CEO is routed to Agency OS; every other signed-in account opens the client portal.",
  signedInTitle: "You are signed in.",
  signedInDetail:
    "This account has client portal access. Use a different Google account only if you need to switch workspaces.",
} as const;
