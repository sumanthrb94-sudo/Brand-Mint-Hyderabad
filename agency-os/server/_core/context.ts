import type { CreateHTTPContextOptions } from "@trpc/server/adapters/standalone";
import { authenticateFirebaseRequest, type FirebaseAgencyUser } from "../firebase";

export type TrpcContext = {
  req: CreateHTTPContextOptions["req"];
  res: CreateHTTPContextOptions["res"];
  user: FirebaseAgencyUser | null;
};

export async function createContext(opts: CreateHTTPContextOptions): Promise<TrpcContext> {
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
