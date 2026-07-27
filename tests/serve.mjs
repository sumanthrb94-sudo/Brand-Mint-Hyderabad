/**
 * A static server that behaves the way Vercel serves this repo.
 *
 * Specifically it honours `cleanUrls`, so `/studio` resolves to `studio.html`.
 * Serving the directory with a plain file server instead would 404 on every
 * internal link, and the journey would fail for a reason that has nothing to
 * do with the product.
 *
 * No dependencies — node:http only. This repo has none and must keep none.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
};

/** Where the locally-bundled Firebase SDK lives. Unset = no rewriting, which
 *  is the correct default anywhere gstatic is reachable. */
const VENDOR_DIR = process.env.BM_VENDOR_DIR || null;

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let rel = decodeURIComponent(url.pathname);

    if (VENDOR_DIR && rel.startsWith("/__vendor/")) {
      // basename only — the shared chunk is fetched by a relative import from
      // the entry files, so it must be servable too.
      const vf = path.join(VENDOR_DIR, path.basename(rel));
      if (!fs.existsSync(vf)) {
        res.writeHead(404).end("vendor file missing: " + path.basename(rel));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
      fs.createReadStream(vf).pipe(res);
      return;
    }

    // No traversal outside the repo, even locally.
    const resolved = path.resolve(ROOT, "." + rel);
    if (!resolved.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }

    let file = resolved;
    if (rel === "/" || rel.endsWith("/")) file = path.join(resolved, "index.html");
    // cleanUrls: /studio -> studio.html
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
      return;
    }

    const type = TYPES[path.extname(file)] || "application/octet-stream";

    /* The Firebase SDK is imported from Google's own CDN in production, which
       is deliberate — auth must not depend on a third party's uptime. This
       container cannot reach gstatic at all, so a browser test of the real
       pages is impossible unless the SDK is served locally.

       So the SERVER rewrites the import specifier. The repo is untouched:
       production still loads from gstatic, and this substitution exists only
       inside this test server. The vendored bundle is pinned to the same
       10.14.1 the pages ask for — testing against a different SDK version
       would prove something about a build nobody ships. */
    if (VENDOR_DIR && (type.startsWith("text/javascript") || type.startsWith("text/html"))) {
      const body = fs
        .readFileSync(file, "utf8")
        .replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.14\.1\/firebase-([a-z]+)\.js/g,
                 "/__vendor/firebase-$1.js");
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(body);
      return;
    }

    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
}

export function listen(port = 5175) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

// Run directly for manual poking: node tests/serve.mjs
if (process.argv[1] && process.argv[1].endsWith("serve.mjs")) {
  const port = Number(process.env.PORT || 5175);
  await listen(port);
  console.log(`serving ${ROOT} on http://127.0.0.1:${port} (cleanUrls on)`);
}
