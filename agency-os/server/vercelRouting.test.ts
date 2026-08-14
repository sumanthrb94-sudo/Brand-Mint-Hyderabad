import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel routing", () => {
  it("reserves API routes for serverless functions before applying the SPA fallback", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

    expect(config.rewrites).toEqual([
      { source: "/((?!api/).*)", destination: "/index.html" },
    ]);
  });

  it("uses CommonJS serverless packaging so Vercel resolves the backend module graph without ESM directory imports", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

    expect(packageJson.type).toBe("commonjs");
    expect(packageJson.scripts.build).toContain("--format=cjs");
  });
});
