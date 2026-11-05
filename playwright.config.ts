import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  // Assertions wait up to 10s: on a busy CI runner the first page load can take several
  // seconds to download and run its JavaScript. No retries, so a real failure still fails.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  // In CI the build has already run, so start the production server.
  // Locally, reuse whatever dev server is already running (or start one).
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
