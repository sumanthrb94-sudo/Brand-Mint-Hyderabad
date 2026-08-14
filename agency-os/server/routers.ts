import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { documentsRouter } from "./routers/documents.js";
import { dashboardRouter } from "./routers/dashboard.js";
import { clientsRouter } from "./routers/clients.js";
import { filesRouter } from "./routers/files.js";
import { invoicesRouter } from "./routers/invoices.js";
import { inquiriesRouter } from "./routers/inquiries.js";
import { onboardingRouter } from "./routers/onboarding.js";
import { portalRouter } from "./routers/portal.js";
import { projectsRouter } from "./routers/projects.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      // Firebase Auth owns the browser session. The client signs out through
      // Firebase directly, so there is no server-side cookie to clear here.
      return { success: true } as const;
    }),
  }),
  onboarding: onboardingRouter,
  portal: portalRouter,
  projects: projectsRouter,
  documents: documentsRouter,
  dashboard: dashboardRouter,
  clients: clientsRouter,
  invoices: invoicesRouter,
  inquiries: inquiriesRouter,
  files: filesRouter,
});

export type AppRouter = typeof appRouter;
