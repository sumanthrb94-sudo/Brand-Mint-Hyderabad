import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { simulationEnabled } from "../simulation/accounts";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // vite.config.ts exports `defineConfig(({ mode }) => ({ … }))`, which is a
  // function. Spreading it produces an empty object, so the dev server would
  // start with none of the project's root, aliases or plugins — `/src/main.tsx`
  // then resolves against the wrong root, is served as HTML, and the client
  // never mounts. Resolve it before spreading.
  const resolvedConfig =
    typeof viteConfig === "function"
      ? await viteConfig({ command: "serve", mode: process.env.NODE_ENV ?? "development" })
      : viteConfig;

  const vite = await createViteServer({
    ...resolvedConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // `?t=` is Vite's own cache-busting query for source modules. `?v=` is
      // reserved for its dependency optimizer: applied to a source file it makes
      // resolution fail ("Failed to load url /src/main.tsx?v=…"), the entry
      // module is served as HTML, and the app never mounts in development.
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?t=${Date.now()}"`
      );

      // The client needs to know it is simulating before React renders — useAuth
      // decides on its first pass whether to observe Firebase or the stored
      // simulation account. A synchronous global is the only signal available
      // that early, and it is written only when the server is itself simulating.
      if (simulationEnabled()) {
        template = template.replace(
          "<head>",
          `<head><script>window.__BRAND_MINT_SIMULATION__ = true;</script>`
        );
      }
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
