import { router } from "../_core/trpc.js";
import { listClients, listInvoices, listNotifications, listProjects, listPublicInquiries } from "../firebaseAgencyDb.js";
import { clearCollection, recordTime } from "../firebaseRepository.js";
import { adminProcedure } from "./access.js";
import { z } from "zod";

export const dashboardRouter = router({
  overview: adminProcedure.query(async () => {
    const [allClients, allProjects, allInvoices, allNotifications, allInquiries] = await Promise.all([listClients(), listProjects(), listInvoices(), listNotifications(), listPublicInquiries()]);
    const byUpdatedAt = <T extends { updatedAt: Date }>(records: T[]) => [...records].sort((a, b) => recordTime(b.updatedAt) - recordTime(a.updatedAt));
    return {
      metrics: {
        activeClients: allClients.filter((client) => client.status === "active").length,
        openProjects: allProjects.filter((project) => project.status !== "complete").length,
        pendingInvoices: allInvoices.filter((invoice) => invoice.status === "issued" || invoice.status === "overdue").length,
        revenuePaise: allInvoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + (Number.isFinite(invoice.totalPaise) ? invoice.totalPaise : 0), 0),
      },
      projects: byUpdatedAt(allProjects),
      invoices: byUpdatedAt(allInvoices).slice(0, 6),
      inquiries: byUpdatedAt(allInquiries).slice(0, 8),
      notifications: byUpdatedAt(allNotifications.filter((notification) => notification.recipientRole === "admin")).slice(0, 6),
    };
  }),
  resetAllData: adminProcedure.input(z.object({ confirm: z.literal(true) })).mutation(async () => {
    // Deliberately leaves clients, contacts, onboarding submissions and legal
    // acceptances alone: this clears the delivery record, not the relationship.
    const collectionsToDelete = ["projects", "checklistItems", "deliverables", "invoices", "invoiceItems", "documents", "storedFiles"] as const;
    let totalDeleted = 0;
    for (const name of collectionsToDelete) {
      totalDeleted += await clearCollection(name);
    }
    return { success: true, deletedCount: totalDeleted, message: `Reset complete. Deleted ${totalDeleted} documents across all collections.` };
  }),
});
