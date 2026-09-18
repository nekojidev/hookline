import { defineConfig, devices } from "@playwright/test"

// Spins up both the WS server and the Vite dev server itself (webServer
// accepts an array) — `npm run test:e2e` is a single command that stands up
// the whole stack, runs two real browser contexts through join -> chat ->
// match start, and tears everything down after.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "npm run dev -w server",
      port: 8080,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: "npm run dev -w client",
      port: 5173,
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
