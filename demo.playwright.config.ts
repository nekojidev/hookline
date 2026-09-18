import { defineConfig, devices } from "@playwright/test"

// Separate from playwright.config.ts on purpose: this one targets the
// dockerized stack (nginx + WS proxy, production build) on :8081, assumes
// `docker compose up` already ran, and records video — none of that
// belongs in the fast CI-facing e2e suite.
export default defineConfig({
  testDir: "./demo",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:8081",
    video: "on",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
