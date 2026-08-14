import { router } from "../_core/trpc.js";
import { listClients, listInvoices, listNotifications, listProjects, listPublicInquiries } from "../firebaseAgencyDb.js";
import { recordTime, COLLECTIONS } from "../firebaseRepository.js";
import { adminProcedure } from "./access.js";
import { z } from "zod";
import { getFirestore, collection, getDocs, deleteDoc } from "firebase/firestore";

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
    const db = getFirestore();
    const collectionsToDelete = [COLLECTIONS.projects, COLLECTIONS.checklistItems, COLLECTIONS.deliverables, COLLECTIONS.invoices, COLLECTIONS.documents, COLLECTIONS.files];
    let totalDeleted = 0;
    for (const collectionName of collectionsToDelete) {
      const snapshot = await getDocs(collection(db, collectionName));
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
        totalDeleted++;
      }
    }
    return { success: true, deletedCount: totalDeleted, message: `Reset complete. Deleted ${totalDeleted} documents across all collections.` };
  }),
});
