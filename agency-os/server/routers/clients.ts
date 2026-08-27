import { router } from "../_core/trpc.js";
import { listClients } from "../firebaseAgencyDb.js";
import { adminProcedure } from "./access.js";

export const clientsRouter = router({
  list: adminProcedure.query(async () => (await listClients()).sort((a, b) => a.companyName.localeCompare(b.companyName))),
});
