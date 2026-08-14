import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc.js";

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "CEO/admin access is required" });
  return next({ ctx });
});
