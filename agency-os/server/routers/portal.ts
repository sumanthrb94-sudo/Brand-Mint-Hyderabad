import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import { bindEligibleClientUser, ensureOnboardingProject, getClientContactForUser, getClientDocuments, getClientFiles, getClientInvoices, getClientProjects, getClient, getLegalAcceptancesForContact, hasAcceptedAllRequiredPolicies } from "../firebaseAgencyDb.js";

async function getEligibleScope(user: { id: string; email?: string | null }) {
  let contact = await getClientContactForUser(user.id);
  if (!contact) {
    await bindEligibleClientUser({ userId: user.id, email: user.email });
    contact = await getClientContactForUser(user.id);
  }
  if (!contact) throw new TRPCError({ code: "FORBIDDEN", message: "Client portal access is not available for this account" });
  const acceptances = await getLegalAcceptancesForContact(contact.id);
  if (!hasAcceptedAllRequiredPolicies(acceptances.map((acceptance) => acceptance.policyType))) throw new TRPCError({ code: "FORBIDDEN", message: "Required legal document acceptance is incomplete" });
  return contact;
}

export const portalRouter = router({
  activate: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Client portal activation is not required for an admin account" });
    const scope = await getEligibleScope(ctx.user);
    return { active: true, clientId: scope.clientId };
  }),
  overview: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Use the CEO dashboard for administrative access" });
    const scope = await getEligibleScope(ctx.user);
    const [client, existingProjects, invoices, documents, files] = await Promise.all([getClient(scope.clientId), getClientProjects(scope.clientId), getClientInvoices(scope.clientId), getClientDocuments(scope.clientId), getClientFiles(scope.clientId)]);
    const projects = existingProjects.length ? existingProjects : (await ensureOnboardingProject(scope.clientId) ? await getClientProjects(scope.clientId) : existingProjects);
    return { client, projects, invoices, documents, files: files.filter((file) => file.fileKind === "signed_document" || file.fileKind === "invoice_pdf") };
  }),
});
