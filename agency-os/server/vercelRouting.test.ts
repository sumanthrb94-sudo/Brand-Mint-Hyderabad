import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stripVercelTrpcMountPath } from "./vercelTrpcPath";

describe("Vercel routing", () => {
  it("reserves API routes for serverless functions before applying the SPA fallback", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

    expect(config.rewrites).toEqual([
      { source: "/((?!api/).*)", destination: "/index.html" },
    ]);
  });

  it("uses ESM serverless packaging with file-explicit API imports", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const apiEntrypoint = readFileSync(new URL("../api/trpc.ts", import.meta.url), "utf8");
    const procedureEntrypoint = readFileSync(new URL("../api/trpc/[...path].ts", import.meta.url), "utf8");

    expect(packageJson.type).toBe("module");
    expect(packageJson.scripts.build).toContain("--format=esm");
    expect(apiEntrypoint).toContain('from "../server/routers.js"');
    expect(apiEntrypoint).toContain('from "../server/_core/context.js"');
    expect(apiEntrypoint).toContain('from "../server/vercelTrpcPath.js"');
    expect(procedureEntrypoint).toContain('from "../trpc.js"');

    const trpcCore = readFileSync(new URL("./_core/trpc.ts", import.meta.url), "utf8");
    expect(trpcCore).toContain("from '../../shared/const.js'");
  });

  it("strips the Vercel function mount path before dispatching a tRPC procedure", () => {
    expect(stripVercelTrpcMountPath("/api/trpc")).toBe("/");
    expect(stripVercelTrpcMountPath("/api/trpc/auth.me?batch=1")).toBe("/auth.me?batch=1");
    expect(stripVercelTrpcMountPath("/api/trpc/projects.list?batch=1&input=test")).toBe(
      "/projects.list?batch=1&input=test",
    );
  });
});
