import { z } from "zod";
import { router } from "../_core/trpc.js";
import { createDeliverable, createProject, getDeliverablesForProject, listClients, listProjects, updateProject } from "../firebaseAgencyDb.js";
import { adminProcedure } from "./access.js";

const projectStatus = z.enum(["discovery", "in_progress", "client_review", "complete"]);

export const projectsRouter = router({
  list: adminProcedure.query(async () => {
    const [projects, clients] = await Promise.all([listProjects(), listClients()]);
    const clientNames = new Map(clients.map((client) => [client.id, client.companyName]));
    return Promise.all([...projects].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map(async (project) => ({
      project,
      clientName: clientNames.get(project.clientId) ?? "Client",
      deliverables: await getDeliverablesForProject(project.id),
    })));
  }),
  create: adminProcedure.input(z.object({
    clientId: z.number().int().positive(),
    title: z.string().trim().min(1).max(256),
    deadlineAt: z.number().int().positive().nullable().optional(),
    assignedTo: z.string().trim().max(256).optional(),
  })).mutation(async ({ input }) => {
    const project = await createProject({ clientId: input.clientId, title: input.title, status: "discovery", deadline: input.deadlineAt ? new Date(input.deadlineAt) : null, assignedTo: input.assignedTo || null });
    return { success: true, projectId: project.id };
  }),
  setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: projectStatus })).mutation(async ({ input }) => {
    await updateProject(input.id, { status: input.status });
    return { success: true };
  }),
  addDeliverable: adminProcedure.input(z.object({
    projectId: z.number().int().positive(),
    title: z.string().trim().min(1).max(256),
    assignedTo: z.string().trim().max(256).optional(),
    dueAt: z.number().int().positive().nullable().optional(),
  })).mutation(async ({ input }) => {
    const deliverable = await createDeliverable({ projectId: input.projectId, title: input.title, status: "planned", assignedTo: input.assignedTo || null, dueAt: input.dueAt ? new Date(input.dueAt) : null });
    return { success: true, deliverableId: deliverable.id };
  }),
});
