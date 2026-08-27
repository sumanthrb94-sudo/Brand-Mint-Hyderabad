import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getEligibleClientScope } from "../clientScope.js";
import { ensureOnboardingProject, getClient, getClientDocuments, getClientFiles, getClientInvoices, getClientProjects } from "../firebaseAgencyDb.js";

export const portalRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Use the CEO dashboard for administrative access" });
    const scope = await getEligibleClientScope(ctx.user);
    const [client, existingProjects, invoices, documents, files] = await Promise.all([getClient(scope.clientId), getClientProjects(scope.clientId), getClientInvoices(scope.clientId), getClientDocuments(scope.clientId), getClientFiles(scope.clientId)]);
    const projects = existingProjects.length ? existingProjects : (await ensureOnboardingProject(scope.clientId) ? await getClientProjects(scope.clientId) : existingProjects);
    return { client, projects, invoices, documents, files: files.filter((file) => file.fileKind === "signed_document" || file.fileKind === "invoice_pdf") };
  }),
});
