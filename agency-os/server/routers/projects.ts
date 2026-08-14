import { z } from "zod";
import { router } from "../_core/trpc.js";
import { createChecklistItem, createNotification, ensureProjectChecklist, getChecklistForProject, getClient, getClientDocuments, getClientInvoices, createDeliverable, createProject, getDeliverablesForProject, getProject, listClients, listProjects, updateChecklistItem, updateProject } from "../firebaseAgencyDb.js";
import { TRPCError } from "@trpc/server";
import { recordTime } from "../firebaseRepository.js";
import { isForwardMove, outstandingRequired, STAGE_LABELS } from "../projectSop.js";
import { adminProcedure } from "./access.js";

const projectStatus = z.enum(["discovery", "in_progress", "client_review", "complete"]);
const pricingMode = z.enum(["package", "personal"]);

export const projectsRouter = router({
  list: adminProcedure.query(async () => {
    const [projects, clients] = await Promise.all([listProjects(), listClients()]);
    const clientNames = new Map(clients.map((client) => [client.id, client.companyName]));
    return Promise.all([...projects].sort((a, b) => recordTime(b.updatedAt) - recordTime(a.updatedAt)).map(async (project) => ({
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
    pricingMode: pricingMode.default("package"),
    basePricePaise: z.number().int().nonnegative().nullable().optional(),
    finalPricePaise: z.number().int().nonnegative().nullable().optional(),
  })).mutation(async ({ input }) => {
    const project = await createProject({ clientId: input.clientId, title: input.title, status: "discovery", deadline: input.deadlineAt ? new Date(input.deadlineAt) : null, assignedTo: input.assignedTo || null, pricingMode: input.pricingMode, basePricePaise: input.basePricePaise ?? null, finalPricePaise: input.pricingMode === "personal" ? input.finalPricePaise ?? null : null });
    await ensureProjectChecklist(project.id);
    return { success: true, projectId: project.id };
  }),
  detail: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const project = await getProject(input.id);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "That project no longer exists" });
    const [client, deliverables, checklist, invoices, documents] = await Promise.all([
      getClient(project.clientId),
      getDeliverablesForProject(project.id),
      // Seeded on read so projects created before the SOP existed pick it up
      // without a migration.
      ensureProjectChecklist(project.id),
      getClientInvoices(project.clientId),
      getClientDocuments(project.clientId),
    ]);
    return {
      project,
      clientName: client?.companyName ?? "Client",
      deliverables,
      checklist: [...checklist].sort((a, b) => a.id - b.id),
      invoices: invoices.filter((invoice) => invoice.projectId == null || invoice.projectId === project.id),
      documents: documents.filter((document) => document.projectId == null || document.projectId === project.id),
    };
  }),
  setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: projectStatus, force: z.boolean().default(false) })).mutation(async ({ input }) => {
    const project = await getProject(input.id);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "That project no longer exists" });
    if (project.status === input.status) return { success: true, outstanding: [] };

    if (isForwardMove(project.status, input.status)) {
      const checklist = await ensureProjectChecklist(input.id);
      const outstanding = outstandingRequired(checklist, project.status);
      if (outstanding.length && !input.force) {
        // Reported rather than thrown so the caller can list exactly what is
        // open and offer the override, instead of showing a bare error.
        return { success: false, outstanding: outstanding.map((item) => item.title) };
      }
      if (outstanding.length && input.force) {
        // An override is the CEO's call, but it must not be silent.
        await createNotification({ recipientRole: "admin", notificationType: "onboarding_complete", title: "Stage advanced with steps outstanding", message: `${project.title} moved to ${STAGE_LABELS[input.status]} with ${outstanding.length} required step(s) still open: ${outstanding.map((item) => item.title).join("; ")}`, clientId: project.clientId });
      }
    }

    await updateProject(input.id, { status: input.status });
    return { success: true, outstanding: [] };
  }),
  setChecklistItem: adminProcedure.input(z.object({ id: z.number().int().positive(), done: z.boolean() })).mutation(async ({ ctx, input }) => {
    await updateChecklistItem(input.id, { done: input.done, doneAt: input.done ? new Date() : null, doneBy: input.done ? ctx.user.email ?? null : null });
    return { success: true };
  }),
  addChecklistItem: adminProcedure.input(z.object({ projectId: z.number().int().positive(), stage: projectStatus, title: z.string().trim().min(1).max(256), required: z.boolean().default(false) })).mutation(async ({ input }) => {
    const item = await createChecklistItem({ projectId: input.projectId, stage: input.stage, title: input.title, required: input.required, done: false, doneAt: null, doneBy: null });
    return { success: true, checklistItemId: item.id };
  }),
  setFinalPrice: adminProcedure.input(z.object({ id: z.number().int().positive(), finalPricePaise: z.number().int().nonnegative() })).mutation(async ({ input }) => {
    const project = await getProject(input.id);
    if (!project) throw new Error("Project not found");
    if (project.pricingMode !== "personal") throw new Error("Final price can be adjusted only for personal projects");
    await updateProject(input.id, { finalPricePaise: input.finalPricePaise });
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
