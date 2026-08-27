import { TRPCError } from "@trpc/server";
import { bindEligibleClientUser, getClientContactForUser, getLegalAcceptancesForContact, hasAcceptedAllRequiredPolicies } from "./firebaseAgencyDb.js";

/**
 * Resolves the client record a signed-in account is allowed to act on.
 *
 * The contact carries a userId only after the account has been bound, which
 * happens the first time it reaches an eligible surface. Any surface a client
 * can arrive at first — the portal, or a payment link straight from an
 * invoice email — has to be able to perform that binding, so this is shared
 * rather than living in whichever router happened to need it first.
 */
export async function getEligibleClientScope(user: { id: string; email?: string | null }) {
  let contact = await getClientContactForUser(user.id);

  if (!contact) {
    try {
      await bindEligibleClientUser({ userId: user.id, email: user.email });
    } catch {
      // Every signed-in Google account can reach these surfaces, so "not a
      // client yet" is the ordinary case rather than a server fault.
      // bindEligibleClientUser signals it with a plain Error, which would
      // otherwise surface as a 500 on each new visitor.
      throw new TRPCError({ code: "FORBIDDEN", message: "Client portal access is not available for this account" });
    }
    contact = await getClientContactForUser(user.id);
  }

  if (!contact) throw new TRPCError({ code: "FORBIDDEN", message: "Client portal access is not available for this account" });

  const acceptances = await getLegalAcceptancesForContact(contact.id);
  if (!hasAcceptedAllRequiredPolicies(acceptances.map((acceptance) => acceptance.policyType))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Required legal document acceptance is incomplete" });
  }

  return contact;
}
