const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/-yek-estekan-sher/",
    serviceWorkers: "allow",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } }
  ],
  webServer: {
    command: "node tests/server.js",
    url: "http://127.0.0.1:4173/-yek-estekan-sher/",
    reuseExistingServer: !process.env.CI,
    timeout: 15000
  }
});