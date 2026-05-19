import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const required = ['VITE_APP_RELEASE_ID', 'SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']
const missing = required.filter((name) => !process.env[name] || process.env[name].trim().length === 0)
const uploadRequired = process.env.SENTRY_UPLOAD_REQUIRED === 'true'
const distAssets = path.resolve(process.cwd(), 'dist/assets')

if (!existsSync(distAssets)) {
  console.error('[sentry] missing dist/assets. Run npm run build first.')
  process.exit(1)
}

if (missing.length > 0) {
  const message = `[sentry] skipping sourcemap upload; missing envs: ${missing.join(', ')}`
  if (uploadRequired) {
    console.error(message)
    process.exit(1)
  }
  console.log(message)
  process.exit(0)
}

const releaseId = process.env.VITE_APP_RELEASE_ID
const env = {
  ...process.env,
  SENTRY_URL: process.env.SENTRY_URL ?? 'https://sentry.io/'
}

function run(args) {
  const result = spawnSync('npx', ['sentry-cli', ...args], {
    stdio: 'inherit',
    env
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(['releases', 'new', releaseId])
run(['releases', 'set-commits', releaseId, '--auto'])
run(['sourcemaps', 'upload', distAssets, '--release', releaseId, '--url-prefix', '~/assets', '--validate'])
run(['releases', 'finalize', releaseId])
