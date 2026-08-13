import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { clients, deliverables, projects } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { adminProcedure } from "./access";

const projectStatus = z.enum(["discovery", "in_progress", "client_review", "complete"]);

export const projectsRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    const projectRows = await db.select({ project: projects, clientName: clients.companyName }).from(projects).innerJoin(clients, eq(projects.clientId, clients.id)).orderBy(desc(projects.updatedAt));
    return Promise.all(projectRows.map(async (row) => ({
      ...row,
      deliverables: await db.select().from(deliverables).where(eq(deliverables.projectId, row.project.id)),
    })));
  }),
  create: adminProcedure.input(z.object({
    clientId: z.number().int().positive(),
    title: z.string().trim().min(1).max(256),
    deadlineAt: z.number().int().positive().nullable().optional(),
    assignedTo: z.string().trim().max(256).optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    await db.insert(projects).values({ clientId: input.clientId, title: input.title, deadline: input.deadlineAt ? new Date(input.deadlineAt) : null, assignedTo: input.assignedTo || null });
    return { success: true };
  }),
  setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: projectStatus })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    await db.update(projects).set({ status: input.status }).where(eq(projects.id, input.id));
    return { success: true };
  }),
  addDeliverable: adminProcedure.input(z.object({
    projectId: z.number().int().positive(),
    title: z.string().trim().min(1).max(256),
    assignedTo: z.string().trim().max(256).optional(),
    dueAt: z.number().int().positive().nullable().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    await db.insert(deliverables).values({ projectId: input.projectId, title: input.title, assignedTo: input.assignedTo || null, dueAt: input.dueAt ? new Date(input.dueAt) : null });
    return { success: true };
  }),
});
