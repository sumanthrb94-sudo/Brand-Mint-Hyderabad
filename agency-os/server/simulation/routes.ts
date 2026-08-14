/**
 * Express routes that exist only while the simulation is running.
 *
 * `registerSimulationRoutes` is called from the server entry point behind
 * `simulationEnabled()`, so none of this is reachable from a production process.
 */

import type { Express } from "express";
import { SIMULATION_ACCOUNTS, simulationEnabled } from "./accounts.js";
import { simulationObject, resetSimulationStore } from "./store.js";

export function registerSimulationRoutes(app: Express) {
  if (!simulationEnabled()) return;

  // The accounts the sign-in screen offers. The client reads this rather than
  // hardcoding a list, so the two cannot drift apart.
  app.get("/api/simulation/accounts", (_req, res) => {
    res.json({
      accounts: SIMULATION_ACCOUNTS.map(({ uid, email, name, role, company }) => ({ uid, email, name, role, company })),
    });
  });

  // Serves the bytes the storage double holds, so an invoice PDF written by the
  // real generator genuinely downloads and opens.
  app.get("/api/simulation/files/:key", (req, res) => {
    const object = simulationObject(decodeURIComponent(req.params.key));
    if (!object) {
      res.status(404).send("No such simulated object");
      return;
    }
    res.setHeader("Content-Type", object.contentType);
    res.send(object.bytes);
  });

  // Lets a test start from a known-empty database without restarting the
  // process. Re-seeding is the caller's responsibility.
  app.post("/api/simulation/reset", (_req, res) => {
    resetSimulationStore();
    res.json({ success: true });
  });
}
