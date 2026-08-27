import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every admin procedure must be reachable from a screen.
 *
 * projects.setStatus shipped to production callable but wired to nothing, so
 * no project could ever leave discovery from any viewport. The server tests all
 * passed — they call the routers directly, which is exactly the blind spot.
 * This asserts each procedure is referenced somewhere the user can actually get
 * to it.
 *
 * A reference is not proof the control works, only that one exists. It is a
 * floor, not a ceiling.
 */
function readAll(dir: string, matcher: RegExp): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return [readAll(path, matcher)];
      return matcher.test(entry.name) ? [readFileSync(path, "utf8")] : [];
    })
    .join("\n");
}

const routerDir = join(import.meta.dirname, "routers");
const clientSource = readAll(join(import.meta.dirname, "..", "client", "src"), /\.tsx?$/);

/** Procedures deliberately not called from the browser, with the reason. */
const NOT_IN_UI: Record<string, string> = {
  // Applied by the signed Razorpay webhook in api/razorpay-webhook.ts. A browser
  // must never be able to mark an invoice paid.
  "payments.applyCapturedPayment": "server-only, webhook applies it",
};

describe("admin procedures are reachable from the UI", () => {
  const routerFiles = readdirSync(routerDir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && name !== "access.ts");

  for (const file of routerFiles) {
    const namespace = file.replace(/\.ts$/, "");
    const source = readFileSync(join(routerDir, file), "utf8");
    // Procedure names are the keys immediately preceding a *Procedure builder.
    const procedures = [...source.matchAll(/^\s{2}(\w+):\s*(admin|protected|public)Procedure/gm)].map((match) => match[1]!);

    for (const procedure of procedures) {
      const qualified = `${namespace}.${procedure}`;
      if (qualified in NOT_IN_UI) continue;

      it(`${qualified} is called from client/src`, () => {
        expect(clientSource, `${qualified} exists on the server but no screen calls it — either wire it up or remove it`).toContain(`${qualified}.use`);
      });
    }
  }
});
