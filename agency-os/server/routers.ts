import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { documentsRouter } from "./routers/documents";
import { dashboardRouter } from "./routers/dashboard";
import { clientsRouter } from "./routers/clients";
import { filesRouter } from "./routers/files";
import { invoicesRouter } from "./routers/invoices";
import { onboardingRouter } from "./routers/onboarding";
import { portalRouter } from "./routers/portal";
import { projectsRouter } from "./routers/projects";

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
  files: filesRouter,
});

export type AppRouter = typeof appRouter;
