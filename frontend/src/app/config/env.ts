const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL
const rawPublicStoreHost = import.meta.env.VITE_PUBLIC_STORE_HOST
const rawPublicEcosystemSlug = import.meta.env.VITE_PUBLIC_ECOSYSTEM_SLUG
const rawObservabilityIngestUrl = import.meta.env.VITE_OBSERVABILITY_INGEST_URL
const rawSentryDsn = import.meta.env.VITE_SENTRY_DSN
const rawAppEnv = import.meta.env.VITE_APP_ENV
const rawAppVersion = import.meta.env.VITE_APP_VERSION
const rawAppCommitSha = import.meta.env.VITE_APP_COMMIT_SHA
const rawAppBuildTimestamp = import.meta.env.VITE_APP_BUILD_TIMESTAMP
const rawAppReleaseId = import.meta.env.VITE_APP_RELEASE_ID
const rawObservabilitySmokeEnabled = import.meta.env.VITE_OBSERVABILITY_SMOKE_ENABLED
const rawSentrySmokeEnabled = import.meta.env.VITE_SENTRY_SMOKE_ENABLED
const rawMode = import.meta.env.MODE

export const appConfig = {
  apiBaseUrl: typeof rawApiBaseUrl === 'string' ? rawApiBaseUrl : '',
  publicStoreHost: typeof rawPublicStoreHost === 'string' ? rawPublicStoreHost : '',
  publicEcosystemSlug: typeof rawPublicEcosystemSlug === 'string' ? rawPublicEcosystemSlug : 'demo-ecosystem',
  observabilityIngestUrl: typeof rawObservabilityIngestUrl === 'string' ? rawObservabilityIngestUrl : '',
  sentryDsn: typeof rawSentryDsn === 'string' ? rawSentryDsn : '',
  appEnv: rawMode === 'test'
    ? 'test'
    : typeof rawAppEnv === 'string' && rawAppEnv.trim().length > 0
    ? rawAppEnv.trim()
    : typeof rawMode === 'string' && rawMode.trim().length > 0
      ? rawMode.trim()
      : 'development',
  appVersion: typeof rawAppVersion === 'string' && rawAppVersion.trim().length > 0 ? rawAppVersion.trim() : 'dev',
  appCommitSha: typeof rawAppCommitSha === 'string' && rawAppCommitSha.trim().length > 0 ? rawAppCommitSha.trim() : 'unknown',
  appBuildTimestamp: typeof rawAppBuildTimestamp === 'string' && rawAppBuildTimestamp.trim().length > 0
    ? rawAppBuildTimestamp.trim()
    : 'unknown',
  appReleaseId: typeof rawAppReleaseId === 'string' && rawAppReleaseId.trim().length > 0
    ? rawAppReleaseId.trim()
    : `${typeof rawAppVersion === 'string' && rawAppVersion.trim().length > 0 ? rawAppVersion.trim() : 'dev'}+${typeof rawAppCommitSha === 'string' && rawAppCommitSha.trim().length > 0 ? rawAppCommitSha.trim() : 'unknown'}`,
  observabilitySmokeEnabled: rawObservabilitySmokeEnabled === 'true',
  sentrySmokeEnabled: rawSentrySmokeEnabled === 'true',
  appName: 'Barmi'
} as const

export type AppConfig = typeof appConfig
