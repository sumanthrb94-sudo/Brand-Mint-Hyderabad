import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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

    expect(packageJson.type).toBe("module");
    expect(packageJson.scripts.build).toContain("--format=esm");
    expect(apiEntrypoint).toContain('from "../server/routers.js"');
    expect(apiEntrypoint).toContain('from "../server/_core/context.js"');

    const trpcCore = readFileSync(new URL("./_core/trpc.ts", import.meta.url), "utf8");
    expect(trpcCore).toContain("from '../../shared/const.js'");
  });
});
