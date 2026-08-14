import { defineConfig, devices } from "@playwright/test";

/**
 * Drives the real application against the simulated studio.
 *
 * The web server below is the ordinary dev server with SIMULATION_MODE=1, so
 * every page these tests open is the production React client talking to the
 * production tRPC routers. Only Firestore and Cloud Storage are in memory.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts",
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  // Serial: the tests share one seeded database and several of them write to it.
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          // Preinstalled in this image; do not download a second copy.
          executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium",
          args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        },
      },
    },
  ],

  webServer: {
    command: "npx tsx server/_core/index.ts",
    url: "http://localhost:3000/api/simulation/accounts",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NODE_ENV: "development",
      SIMULATION_MODE: "1",
      VITE_SIMULATION_MODE: "1",
      PORT: "3000",
    },
  },
});
