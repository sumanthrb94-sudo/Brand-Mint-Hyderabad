import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const handler = createHTTPHandler({ router: appRouter, createContext });

export default function trpcHandler(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
