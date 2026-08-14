export type AgencyRole = "admin" | "client" | "user" | null | undefined;

/**
 * The public entry point is shared, but internal destinations remain role-safe.
 * Admins can continue to the requested protected workspace; all other approved
 * accounts are directed to the existing client portal.
 */
export function destinationForRole(role: AgencyRole, requestedPath: string = "/admin") {
  return role === "admin" ? requestedPath : "/portal";
}

export const accessCopy = {
  signedOutTitle: "Log in to know more.",
  signedOutDetail:
    "Use Google to access your Brand Mint client workspace. New to Brand Mint? Explore our ecommerce services and start a project conversation.",
  signedInTitle: "Your Brand Mint access is ready.",
  signedInDetail:
    "Open your client portal to view eligible project information, documents and invoices. Need to use another Google account? Switch accounts below.",
} as const;
