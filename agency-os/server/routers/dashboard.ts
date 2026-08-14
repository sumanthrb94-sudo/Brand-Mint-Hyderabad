import { router } from "../_core/trpc.js";
import { listClients, listInvoices, listNotifications, listProjects, listPublicInquiries } from "../firebaseAgencyDb.js";
import { adminProcedure } from "./access.js";

export const dashboardRouter = router({
  overview: adminProcedure.query(async () => {
    const [allClients, allProjects, allInvoices, allNotifications, allInquiries] = await Promise.all([listClients(), listProjects(), listInvoices(), listNotifications(), listPublicInquiries()]);
    const byUpdatedAt = <T extends { updatedAt: Date }>(records: T[]) => [...records].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return {
      metrics: {
        activeClients: allClients.filter((client) => client.status === "active").length,
        openProjects: allProjects.filter((project) => project.status !== "complete").length,
        pendingInvoices: allInvoices.filter((invoice) => invoice.status === "issued" || invoice.status === "overdue").length,
        revenuePaise: allInvoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.totalPaise, 0),
      },
      projects: byUpdatedAt(allProjects),
      invoices: byUpdatedAt(allInvoices).slice(0, 6),
      inquiries: byUpdatedAt(allInquiries).slice(0, 8),
      notifications: byUpdatedAt(allNotifications.filter((notification) => notification.recipientRole === "admin")).slice(0, 6),
    };
  }),
});
