import * as Sentry from '@sentry/react'
import { releaseMetadata } from './release'

let sentryInitialized = false

function browserName() {
  if (typeof navigator === 'undefined') return 'unknown'
  const userAgent = navigator.userAgent
  if (userAgent.includes('Firefox/')) return 'firefox'
  if (userAgent.includes('Edg/')) return 'edge'
  if (userAgent.includes('Chrome/')) return 'chrome'
  if (userAgent.includes('Safari/')) return 'safari'
  return 'unknown'
}

export function initSentry(dsn: string) {
  if (sentryInitialized || !dsn.trim()) return

  Sentry.init({
    dsn,
    environment: releaseMetadata.env,
    release: releaseMetadata.releaseId,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.httpClientIntegration()
    ],
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      event.tags = {
        ...event.tags,
        app: releaseMetadata.app,
        version: releaseMetadata.version,
        commit_sha: releaseMetadata.commitSha,
        build_timestamp: releaseMetadata.buildTimestamp,
        browser: browserName()
      }
      return event
    }
  })

  sentryInitialized = true
}

export function sentryEnabled() {
  return sentryInitialized
}

export { Sentry }
