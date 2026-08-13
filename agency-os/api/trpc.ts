import type { Request, Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

export const config = { api: { bodyParser: false } };

const handler = createExpressMiddleware({ router: appRouter, createContext });

export default function trpcHandler(req: Request, res: Response) {
  return handler(req, res);
}
