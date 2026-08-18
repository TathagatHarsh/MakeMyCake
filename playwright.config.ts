// The kitchen board sits behind HTTP Basic, and the credentials live in .env
// alongside DATABASE_URL. Playwright does not read .env on its own.
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

const KITCHEN_USER = process.env.KITCHEN_USER;
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],

  // Baselines live beside the specs and are committed; a diff is a failure.
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",

  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      // Anti-aliasing on a software GL stack is never bit-exact.
      maxDiffPixelRatio: 0.02,
      threshold: 0.08,
      animations: "disabled",
    },
  },

  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    // Sent only when a route actually challenges, so the public pages are
    // exercised exactly as an anonymous visitor sees them.
    httpCredentials:
      KITCHEN_USER && KITCHEN_PASSWORD
        ? { username: KITCHEN_USER, password: KITCHEN_PASSWORD }
        : undefined,
    // SwiftShader, so WebGL works on a machine with no GPU available to the
    // headless browser. The builder is unusable without it.
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=default", "--enable-unsafe-swiftshader"],
    },
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
