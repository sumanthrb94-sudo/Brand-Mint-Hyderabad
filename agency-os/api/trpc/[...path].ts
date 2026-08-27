import trpcHandler from "../trpc.js";

// Vercel needs an explicit catch-all function for procedure URLs such as
// /api/trpc/auth.me, in addition to the root /api/trpc function.
export default trpcHandler;
