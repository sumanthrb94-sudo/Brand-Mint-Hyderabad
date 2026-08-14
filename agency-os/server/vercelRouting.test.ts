import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel routing", () => {
  it("reserves API routes for serverless functions before applying the SPA fallback", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

    expect(config.rewrites).toEqual([
      { source: "/((?!api/).*)", destination: "/index.html" },
    ]);
  });
});
