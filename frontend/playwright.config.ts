import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'npm run dev'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true'
    ? undefined
    : {
      command: webServerCommand,
      url: baseURL,
      reuseExistingServer: true,
    },
})
