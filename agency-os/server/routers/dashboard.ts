import { desc, eq } from "drizzle-orm";
import { clients, invoices, notifications, projects } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { adminProcedure } from "./access";

export const dashboardRouter = router({
  overview: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    const [allClients, allProjects, allInvoices, recentNotifications] = await Promise.all([
      db.select().from(clients),
      db.select().from(projects).orderBy(desc(projects.updatedAt)),
      db.select().from(invoices).orderBy(desc(invoices.updatedAt)),
      db.select().from(notifications).where(eq(notifications.recipientRole, "admin")).orderBy(desc(notifications.createdAt)).limit(6),
    ]);
    return {
      metrics: {
        activeClients: allClients.filter((client) => client.status === "active").length,
        openProjects: allProjects.filter((project) => project.status !== "complete").length,
        pendingInvoices: allInvoices.filter((invoice) => invoice.status === "issued" || invoice.status === "overdue").length,
        revenuePaise: allInvoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.totalPaise, 0),
      },
      projects: allProjects,
      invoices: allInvoices.slice(0, 6),
      notifications: recentNotifications,
    };
  }),
});
