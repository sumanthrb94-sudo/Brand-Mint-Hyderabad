import { router } from "../_core/trpc";
import { listClients } from "../firebaseAgencyDb";
import { adminProcedure } from "./access";

export const clientsRouter = router({
  list: adminProcedure.query(async () => (await listClients()).sort((a, b) => a.companyName.localeCompare(b.companyName))),
});
