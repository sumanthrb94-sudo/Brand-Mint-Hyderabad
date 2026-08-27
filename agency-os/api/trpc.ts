import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";
import { stripVercelTrpcMountPath } from "../server/vercelTrpcPath.js";

const handler = createHTTPHandler({ router: appRouter, createContext });

export default function trpcHandler(req: VercelRequest, res: VercelResponse) {
  req.url = stripVercelTrpcMountPath(req.url);
  return handler(req, res);
}
