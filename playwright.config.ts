// Playwright configuration.
//
// Journeys live in `e2e/`, owned by @tester. Chromium only at bootstrap:
// the application is a self-hosted tool running on a known machine, so a
// cross-browser matrix costs run time without covering a real risk. Add a
// project here when a specific browser becomes a requirement.
//
// There is no CI branching here on purpose. Continuous integration is
// deliberately not set up at bootstrap (`specs/init.md` -> Notes), and
// `policy_coding_guidelines.md` -> Forbidden keeps `process.env` out of
// everything but `src/lib/config.ts`. Add the CI settings with the CI.

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  reporter: "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // `pnpm dev` is usually already running in the development container.
  // reuseExistingServer stops a run from starting a second one on the
  // same port.
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
