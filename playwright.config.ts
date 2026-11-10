import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const LOCAL_CHROME = "/opt/ms-playwright/chromium-1194/chrome-linux/chrome";
const executablePath =
  process.env["E2E_CHROME_PATH"] ?? (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined);

/** ঔষধওয়ালা — Next.js 16 + MySQL smoke e2e */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env["CI"] ? 1 : 0,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/test-results.json" }],
  ],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  webServer: process.env["E2E_BASE_URL"]
    ? undefined
    : {
        command: "npm run start -- -p 3000 -H 127.0.0.1",
        url: "http://127.0.0.1:3000/api/public/health",
        reuseExistingServer: !process.env["CI"],
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
});
