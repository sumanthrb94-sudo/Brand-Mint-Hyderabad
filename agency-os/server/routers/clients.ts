import { asc } from "drizzle-orm";
import { clients } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { adminProcedure } from "./access";

export const clientsRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    return db.select().from(clients).orderBy(asc(clients.companyName));
  }),
});
