import { defineConfig, devices } from "@playwright/test";

// Minimal smoke-test setup — this repo had no Playwright config before.
//
// Uses `vite dev` (package.json's `dev` script), NOT `vite preview`.
// `npm run preview` is currently broken for this project independent of
// Playwright: vite.config.ts pins the Nitro build to the `vercel` preset
// (output at .vercel/output/functions/...), but
// @tanstack/start-plugin-core's preview-server-plugin hardcodes an
// expectation of the default preset's dist/server/server.js — every
// request 500s with ERR_MODULE_NOT_FOUND. Confirmed via a direct curl
// against a `vite preview` server, independent of this test suite. This
// doesn't affect the real Vercel deployment (which never runs `vite
// preview`), only local preview — documented in .claude/progress.md as a
// separate, pre-existing finding rather than fixed here (out of scope).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    // Port 8080, not Vite's usual 5173 — set by this project's
    // @lovable.dev/vite-tanstack-config wrapper (sandbox port detection).
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
