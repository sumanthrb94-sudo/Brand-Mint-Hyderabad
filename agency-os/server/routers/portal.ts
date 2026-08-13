import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { clients, documents, invoices, projects, storedFiles } from "../../drizzle/schema";
import { bindEligibleClientUser, getClientContactForUser, getLegalAcceptancesForContact, hasAcceptedAllRequiredPolicies } from "../agencyDb";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function getEligibleScope(user: { id: number; email?: string | null }) {
  let contact = await getClientContactForUser(user.id);
  if (!contact) {
    await bindEligibleClientUser({ userId: user.id, email: user.email });
    contact = await getClientContactForUser(user.id);
  }
  if (!contact) throw new TRPCError({ code: "FORBIDDEN", message: "Client portal access is not available for this account" });
  const acceptances = await getLegalAcceptancesForContact(contact.id);
  if (!hasAcceptedAllRequiredPolicies(acceptances.map((acceptance) => acceptance.policyType))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Required legal document acceptance is incomplete" });
  }
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
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable" });
    const client = (await db.select().from(clients).where(eq(clients.id, scope.clientId)).limit(1))[0];
    const clientProjects = await db.select().from(projects).where(eq(projects.clientId, scope.clientId));
    const clientInvoices = await db.select().from(invoices).where(eq(invoices.clientId, scope.clientId));
    const clientDocuments = await db.select().from(documents).where(eq(documents.clientId, scope.clientId));
    const clientFiles = await db.select().from(storedFiles).where(and(eq(storedFiles.clientId, scope.clientId), inArray(storedFiles.fileKind, ["signed_document", "invoice_pdf"])));
    return { client, projects: clientProjects, invoices: clientInvoices, documents: clientDocuments, files: clientFiles };
  }),
});
