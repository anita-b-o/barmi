import * as Sentry from '@sentry/react'
import { appConfig } from '@/app/config/env'
import { releaseMetadata } from './release'
import { deriveSentryContextFromLocation, sanitizeSentryEvent, shouldDropSentryEvent, type SentryPolicyEvent } from './sentryPolicy'

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
      const browserContext = typeof window === 'undefined'
        ? { route: '', tags: {} }
        : deriveSentryContextFromLocation(window.location)
      const eventRoute = typeof event.tags?.route === 'string' ? event.tags.route : browserContext.route
      if (shouldDropSentryEvent(eventRoute)) return null

      event.tags = {
        ...event.tags,
        app: releaseMetadata.app,
        app_env: appConfig.appEnv,
        release_id: releaseMetadata.releaseId,
        version: releaseMetadata.version,
        commit_sha: releaseMetadata.commitSha,
        build_timestamp: releaseMetadata.buildTimestamp,
        browser: browserName(),
        ...browserContext.tags
      }
      return sanitizeSentryEvent(event as unknown as SentryPolicyEvent) as unknown as typeof event
    }
  })

  sentryInitialized = true
}

export function sentryEnabled() {
  return sentryInitialized
}

export { Sentry }
