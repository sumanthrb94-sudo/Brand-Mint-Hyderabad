// Brand Mint end-to-end checks.
//
// Runs against a local static server that mimics Vercel's cleanUrls:true, so
// it tests the real files that get deployed.
//
//   Run it:
//     cd /tmp && npm i playwright && cd -
//     NODE_PATH=/tmp/node_modules node tests/e2e.mjs
//
// Playwright is installed OUTSIDE this repo on purpose. There is no
// package.json here and there must not be one — Vercel serves this directory
// as static files with no build step, and the deployed site has zero runtime
// dependencies. See CLAUDE.md section 3.
//
// Six auth checks need the Firebase SDK from gstatic. Where that is blocked
// they are reported as SKIP, never as a pass — a green tick for a check that
// did not run is worse than a red one. Each skipped check has a static
// counterpart that still runs, so nothing is silently unverified.

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = 8099;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json",
};

// Mimic vercel.json cleanUrls: /login -> login.html
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  let file = path.join(ROOT, p);
  if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("not found");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const results = [];
const record = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const skip = (name, why) => {
  results.push({ name, skipped: true, detail: why });
  console.log(`SKIP  ${name} — ${why}`);
};

// Auth guards need the Firebase SDK from gstatic. Some sandboxes block it,
// and a blocked CDN would make every auth assertion fail for a reason that
// has nothing to do with the code. Detect it and skip honestly instead of
// reporting a red that is not real.
let firebaseReachable = false;
try {
  const res = await fetch("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js", {
    method: "HEAD",
    signal: AbortSignal.timeout(15000),
  });
  firebaseReachable = res.ok;
} catch {
  firebaseReachable = false;
}
if (!firebaseReachable) {
  console.log("NOTE  Firebase CDN unreachable from here — auth-dependent checks will be skipped.\n");
}

// WCAG relative luminance / contrast
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const parseRgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

try {
  const ctx = await browser.newContext();

  // --- console error tracking across every page we visit ---
  const consoleErrors = {};
  const newPage = async (url) => {
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
    consoleErrors[url] = errs;
    return page;
  };

  // 1. Marketing site loads and no longer carries the removed claims
  const home = await newPage("/");
  const bodyText = await home.innerText("body");
  const banned = [
    "200+", "₹500", "500Cr", "98%", "4.9", "42.6", "42×",
    "Forbes", "Economic Times", "YourStory", "Awwwards", "CSSDA", "The Ken",
    "Head of Design", "Head of Engineering", "£20M",
  ];
  const found = banned.filter((b) => bodyText.includes(b));
  record("marketing: unsubstantiated claims removed", found.length === 0,
    found.length ? `still present: ${found.join(", ")}` : "none of 16 banned strings present");

  // 2. Services and prices still intact (these are verified-true, must survive)
  // The menu after stores were split out of websites and care plans added.
  const mustKeep = [
    "Custom internal tools", "Online stores", "Websites", "AI & automation",
    "Brand & identity", "Performance media", "SEO & content",
    "Care", "Growth", "Managed commerce",
    "₹4 L", "₹2.4 L", "₹2 L", "₹30 K", "₹1.5 L", "₹75 K",
    "₹12,500", "₹25,000", "₹50,000",
  ];
  const missing = mustKeep.filter((s) => !bodyText.includes(s));
  record("marketing: menu and prices intact", missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : `${mustKeep.length} services and prices present`);

  // The fix that matters: e-commerce must not be sold at the website price.
  const websitesPitch = (bodyText.match(/Websites\s+([\s\S]{0,220})/) || [])[1] || "";
  record("marketing: e-commerce is not sold under Websites",
    !/e-commerce/i.test(websitesPitch),
    "stores have their own line at ₹2.4 L");

  // Promises with no deliverable behind them.
  const unscoped = ["Canva templates", "Programmatic SEO", "Topic graphs", "Guardrails"];
  const stillThere = unscoped.filter((s) => bodyText.includes(s));
  record("marketing: no unscoped chips", stillThere.length === 0,
    stillThere.length ? `still promising: ${stillThere.join(", ")}` : "all removed");

  // 3. Nav "Log in" points at the real portal, no Sign up
  const loginHref = await home.getAttribute("a.nav-signin", "href");
  record("marketing: Log in points to /login", loginHref === "/login", `href=${loginHref}`);
  record("marketing: self-serve Sign up removed",
    (await home.locator("a.nav-signup").count()) === 0);

  // 4. nav-signup contrast regression guard (was 1:1)
  const cta = home.locator(".btn--ghost").first();
  const ctaColors = await cta.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fg: s.color, bg: s.backgroundColor };
  });
  record("marketing: nav CTA is not invisible",
    ctaColors.fg !== ctaColors.bg, `fg=${ctaColors.fg} bg=${ctaColors.bg}`);

  // 5. Signed-out redirects for every protected route.
  // Also asserts the fail-closed property: even when the guard cannot run,
  // no page may leak content to a signed-out visitor.
  for (const route of ["/portal", "/studio", "/onboarding", "/quote", "/tenancy-check", "/services"]) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`);
    if (firebaseReachable) {
      await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
      record(`auth: ${route} bounces a signed-out visitor to /login`,
        new URL(page.url()).pathname === "/login", `landed on ${new URL(page.url()).pathname}`);
    } else {
      skip(`auth: ${route} bounces a signed-out visitor to /login`, "Firebase CDN blocked in this sandbox");
      // The guard could not run — so verify nothing rendered regardless.
      const leaked = await page.evaluate(() => {
        const main = document.getElementById("bm-main");
        return main ? !main.hidden : false;
      });
      record(`auth: ${route} renders no content while unauthenticated`, !leaked,
        leaked ? "main content was visible without auth" : "main stayed hidden");
    }
    await page.close();
  }

  // 6. /login renders and its primary CTA clears 4.5:1 (was 1.03:1)
  const login = await newPage("/login");
  const submit = login.locator("#bm-login-submit");
  const c = await submit.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fg: s.color, bg: s.backgroundColor };
  });
  const ratio = contrast(parseRgb(c.fg), parseRgb(c.bg));
  record("login: Sign in CTA clears 4.5:1 contrast", ratio >= 4.5,
    `${ratio.toFixed(2)}:1 (${c.fg} on ${c.bg})`);

  // 7. Login failure message is identical for both failure modes, so it
  // cannot be used to enumerate which usernames exist.
  if (firebaseReachable) {
    const messages = [];
    for (const [u, p] of [["definitelynotarealuser", "wrongpassword"], ["admin", "wrongpassword"]]) {
      await login.fill("#bm-username", u);
      await login.fill("#bm-password", p);
      await login.click("#bm-login-submit");
      await login.waitForSelector("#bm-login-status:not([hidden])", { timeout: 20000 }).catch(() => {});
      messages.push((await login.innerText("#bm-login-status").catch(() => "")).trim());
    }
    record("login: generic failure message", messages[0] === "Wrong username or password.",
      JSON.stringify(messages[0]));
    record("login: message is identical for unknown user and wrong password (no enumeration)",
      messages[0] === messages[1] && messages[0] !== "", JSON.stringify(messages));
  } else {
    skip("login: generic failure message", "Firebase CDN blocked in this sandbox");
    // Static guarantee we can still check: exactly one literal, no branching.
    const src = fs.readFileSync(path.join(ROOT, "login.html"), "utf8");
    const literals = [...src.matchAll(/status\.textContent\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
    record("login: source contains exactly one failure message literal",
      literals.length === 1 && literals[0] === "Wrong username or password.",
      JSON.stringify(literals));
  }

  // 8. No credential fields anywhere except /login's own password box
  for (const route of ["/portal", "/onboarding", "/studio", "/quote", "/tenancy-check"]) {
    const src = fs.readFileSync(path.join(ROOT, `${route.slice(1)}.html`), "utf8");
    record(`security: ${route} has no password field`, !src.includes('type="password"'));
  }

  // 9. Onboarding carries the never-send-a-password line
  const onboardingSrc = fs.readFileSync(path.join(ROOT, "onboarding.html"), "utf8");
  record("security: /onboarding carries the never-send-a-password line",
    onboardingSrc.includes("Never send us a password"));

  // 10. No service account key can be committed
  const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  record("security: service account keys are gitignored",
    gitignore.includes("adminsdk") && gitignore.includes("service-account"));

  // 11. Zero console errors on public pages
  for (const [url, errs] of Object.entries(consoleErrors)) {
    const real = errs.filter((e) => !/favicon|net::ERR_/i.test(e));
    record(`console: ${url} has no errors`, real.length === 0, real.slice(0, 2).join(" | "));
  }

  await ctx.close();
} finally {
  await browser.close();
  server.close();
}

const skipped = results.filter((r) => r.skipped);
const ran = results.filter((r) => !r.skipped);
const failed = ran.filter((r) => !r.pass);
console.log(`\n${ran.length - failed.length}/${ran.length} passed, ${skipped.length} skipped`);
if (failed.length) {
  console.log("\nFailures:");
  failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`));
}
if (skipped.length) {
  console.log(`\nSkipped (need network to Firebase — re-run where gstatic is reachable):`);
  skipped.forEach((s) => console.log(`  - ${s.name}`));
}
process.exit(failed.length ? 1 : 0);
