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

// The origin must be `localhost`, never `127.0.0.1`. Next 16 treats
// 127.0.0.1 as cross-origin for dev resources and blocks the HMR websocket
// ("Blocked cross-origin request to Next.js dev resource /_next/hmr"). The
// page still loads and every chunk returns 200, but the client never
// hydrates: no React fiber attaches, and clicks do nothing, with no error
// in the test output. Dev-only - `next start` serves no HMR and applies no
// dev-origin check - but it breaks every journey run against a dev server.
//
// The alternative, `allowedDevOrigins: ["127.0.0.1"]` in `next.config.ts`,
// was rejected: it weakens a Next security default instead of conforming to
// it; `localhost` is the origin Next accepts with no configuration, so there
// is no second file to keep in sync; and this is the form that still works
// unchanged under CI (`context/vision.md` -> Roadmap -> Later).
const BASE_URL = "http://localhost:3000";

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
