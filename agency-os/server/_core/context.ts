import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { authenticateFirebaseRequest, type FirebaseAgencyUser } from "../firebase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: FirebaseAgencyUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: FirebaseAgencyUser | null = null;

  try {
    user = await authenticateFirebaseRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
