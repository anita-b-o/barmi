import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'npm run dev'
const ignoresLocalStagingCertificate =
  baseURL.startsWith('https://') && baseURL.includes('staging.127.0.0.1.sslip.io')

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
    ignoreHTTPSErrors: ignoresLocalStagingCertificate,
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true'
    ? undefined
    : {
      command: webServerCommand,
      url: baseURL,
      reuseExistingServer: true,
    },
})
