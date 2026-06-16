import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'

function readGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

const version = process.env.VITE_APP_VERSION ?? process.env.npm_package_version ?? '0.1.0'
const commitSha = process.env.VITE_APP_COMMIT_SHA ?? readGitSha()
const buildTimestamp = process.env.VITE_APP_BUILD_TIMESTAMP ?? new Date().toISOString()
const appEnv = process.env.VITE_APP_ENV
const releaseId = process.env.VITE_APP_RELEASE_ID ?? `${version}+${commitSha}`
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryAutoUpload = process.env.SENTRY_AUTO_UPLOAD === 'true'
const sentryUploadRequired = process.env.SENTRY_UPLOAD_REQUIRED === 'true'
const hasSentryUploadEnv = Boolean(sentryOrg && sentryProject && sentryAuthToken)
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET ?? 'http://localhost:8080'

if (sentryUploadRequired && !hasSentryUploadEnv) {
  throw new Error('SENTRY_UPLOAD_REQUIRED=true but SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT are missing')
}

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      release: {
        name: releaseId,
        create: sentryAutoUpload && hasSentryUploadEnv,
        finalize: sentryAutoUpload && hasSentryUploadEnv
      },
      sourcemaps: {
        assets: './dist/**'
      },
      telemetry: false,
      disable: !(sentryAutoUpload && hasSentryUploadEnv)
    })
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_APP_COMMIT_SHA': JSON.stringify(commitSha),
    'import.meta.env.VITE_APP_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.VITE_APP_ENV': JSON.stringify(appEnv ?? 'development'),
    'import.meta.env.VITE_APP_RELEASE_ID': JSON.stringify(releaseId)
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-map'
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-ui'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
          return undefined
        }
      }
    }
  },
  resolve: {
    alias: {
      '@/api': fileURLToPath(new URL('./src/api', import.meta.url)),
      '@/app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@/core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@/features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@/layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      '@/pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@/assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@/storybook': fileURLToPath(new URL('./src/storybook', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['demo-store.example.com', 'demo-store.localhost'],
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'tests/**',
      '**/*.e2e.{ts,tsx}',
    ],
  },
})
