import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("CEO authorization", () => {
  it("rejects non-admin users before a CEO dashboard query reaches operational data", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 10,
        openId: "client-user",
        name: "Client User",
        email: "client@example.com",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    } as TrpcContext);

    await expect(caller.dashboard.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
