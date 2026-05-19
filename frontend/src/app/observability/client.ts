import { appConfig } from '@/app/config/env'
import { releaseMetadata } from './release'
import { Sentry, sentryEnabled } from './sentry'

type ObservabilityLevel = 'info' | 'warn' | 'error'
type ObservabilityEventType =
  | 'runtime_error'
  | 'unhandled_rejection'
  | 'route_render_error'
  | 'query_error'
  | 'mutation_error'
  | 'http_error'
  | 'offline'
  | 'online'

type ErrorLike = {
  name?: string
  message?: string
  stack?: string
  code?: string
  status?: number
  requestId?: string
  cause?: string
}

export type ObservabilityEvent = {
  type: ObservabilityEventType
  level: ObservabilityLevel
  message: string
  requestId?: string
  route?: string
  tags?: Record<string, string>
  error?: ErrorLike
  extra?: Record<string, unknown>
}

type ObservabilityEnvelope = {
  app: string
  env: string
  version: string
  releaseId: string
  commitSha: string
  buildTimestamp: string
  sessionId: string
  occurredAt: string
  url: string
  userAgent: string
  online: boolean
  payload: ObservabilityEvent
}

const SESSION_ID = createIdentifier()
let flushInProgress = false
let lastBackendRequestId: string | undefined

function createIdentifier() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `barmi-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

function currentRoute() {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function serializeError(error: unknown): ErrorLike | undefined {
  if (!error) return undefined
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }
  if (isRecord(error)) {
    return {
      name: typeof error.name === 'string' ? error.name : undefined,
      message: typeof error.message === 'string' ? error.message : undefined,
      stack: typeof error.stack === 'string' ? error.stack : undefined,
      code: typeof error.code === 'string' ? error.code : undefined,
      status: typeof error.status === 'number' ? error.status : undefined,
      requestId: typeof error.requestId === 'string' ? error.requestId : undefined,
      cause: typeof error.cause === 'string' ? error.cause : undefined
    }
  }
  if (typeof error === 'string') {
    return { message: error }
  }
  return undefined
}

function buildEnvelope(payload: ObservabilityEvent): ObservabilityEnvelope {
  return {
    app: appConfig.appName,
    env: appConfig.appEnv,
    version: appConfig.appVersion,
    releaseId: releaseMetadata.releaseId,
    commitSha: releaseMetadata.commitSha,
    buildTimestamp: releaseMetadata.buildTimestamp,
    sessionId: SESSION_ID,
    occurredAt: new Date().toISOString(),
    url: typeof window === 'undefined' ? '' : window.location.href,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    payload: {
      ...payload,
      requestId: payload.requestId ?? lastBackendRequestId,
      route: payload.route ?? currentRoute()
    }
  }
}

function logToConsole(envelope: ObservabilityEnvelope) {
  const method = envelope.payload.level === 'error'
    ? console.error
    : envelope.payload.level === 'warn'
      ? console.warn
      : console.info

  method('[observability]', envelope)
}

function sentryLevel(level: ObservabilityLevel): 'info' | 'warning' | 'error' {
  if (level === 'warn') return 'warning'
  return level
}

function isRelevantSentryEvent(envelope: ObservabilityEnvelope) {
  const status = envelope.payload.error?.status ?? 0
  const code = envelope.payload.error?.code ?? ''
  const route = envelope.payload.route ?? ''

  if (['runtime_error', 'unhandled_rejection', 'route_render_error'].includes(envelope.payload.type)) {
    return true
  }
  if (['offline', 'online'].includes(envelope.payload.type)) {
    return false
  }
  if (code === 'offline' || code === 'network_error') {
    return true
  }
  if (status >= 500) {
    return true
  }
  if ((route.includes('checkout') || route.includes('payments')) && status >= 400) {
    return true
  }
  if (route.includes('auth') && ['unauthorized', 'forbidden', 'invalid_refresh_token', 'refresh_token_expired', 'concurrent_auth_request'].includes(code)) {
    return true
  }
  return false
}

function sendToSentry(envelope: ObservabilityEnvelope) {
  if (!sentryEnabled() || !isRelevantSentryEvent(envelope)) return

  Sentry.withScope((scope) => {
    scope.setLevel(sentryLevel(envelope.payload.level))
    scope.setTag('observability_type', envelope.payload.type)
    scope.setTag('environment', envelope.env)
    scope.setTag('route', envelope.payload.route ?? '')
    scope.setTag('release_id', envelope.releaseId)
    if (envelope.payload.requestId) {
      scope.setTag('request_id', envelope.payload.requestId)
    }
    if (envelope.payload.tags) {
      Object.entries(envelope.payload.tags).forEach(([key, value]) => scope.setTag(key, value))
    }

    scope.setContext('release', {
      version: envelope.version,
      releaseId: envelope.releaseId,
      commitSha: envelope.commitSha,
      buildTimestamp: envelope.buildTimestamp
    })
    scope.setContext('browser', {
      userAgent: envelope.userAgent,
      online: envelope.online,
      url: envelope.url
    })
    if (envelope.payload.extra) {
      scope.setContext('extra', envelope.payload.extra)
    }
    if (envelope.payload.requestId) {
      scope.setContext('correlation', { requestId: envelope.payload.requestId })
    }

    const error = envelope.payload.error
    if (error) {
      scope.setContext('error', {
        code: error.code,
        status: error.status,
        requestId: error.requestId,
        cause: error.cause
      })
      const sentryError = Object.assign(new Error(error.message ?? envelope.payload.message), error)
      Sentry.captureException(sentryError)
      return
    }

    Sentry.captureMessage(envelope.payload.message, sentryLevel(envelope.payload.level))
  })
}

function sendToIngest(envelope: ObservabilityEnvelope) {
  const endpoint = appConfig.observabilityIngestUrl.trim()
  if (!endpoint || typeof window === 'undefined' || flushInProgress) return

  const body = JSON.stringify(envelope)

  try {
    flushInProgress = true
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(endpoint, blob)
      return
    }

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors'
    }).catch(() => undefined)
  } finally {
    flushInProgress = false
  }
}

export function reportObservabilityEvent(event: ObservabilityEvent) {
  const envelope = buildEnvelope({
    ...event,
    error: serializeError(event.error)
  })

  if (appConfig.appEnv !== 'production' && appConfig.appEnv !== 'test') {
    logToConsole(envelope)
  }
  sendToIngest(envelope)
  sendToSentry(envelope)
}

export function getLastBackendRequestId() {
  return lastBackendRequestId
}

export function reportRuntimeError(error: unknown, extra?: Record<string, unknown>) {
  const serialized = serializeError(error)
  reportObservabilityEvent({
    type: 'runtime_error',
    level: 'error',
    message: serialized?.message ?? 'Unhandled runtime error',
    requestId: serialized?.requestId,
    error: serialized,
    extra
  })
}

export function reportUnhandledRejection(reason: unknown) {
  const serialized = serializeError(reason)
  reportObservabilityEvent({
    type: 'unhandled_rejection',
    level: 'error',
    message: serialized?.message ?? 'Unhandled promise rejection',
    requestId: serialized?.requestId,
    error: serialized
  })
}

export function reportRouteRenderError(error: unknown, extra?: Record<string, unknown>) {
  const serialized = serializeError(error)
  reportObservabilityEvent({
    type: 'route_render_error',
    level: 'error',
    message: serialized?.message ?? 'Route render failed',
    requestId: serialized?.requestId,
    error: serialized,
    extra
  })
}

export function reportQueryError(error: unknown, meta?: Record<string, unknown>) {
  const serialized = serializeError(error)
  reportObservabilityEvent({
    type: 'query_error',
    level: 'warn',
    message: serialized?.message ?? 'Query failed',
    requestId: serialized?.requestId,
    error: serialized,
    extra: meta
  })
}

export function reportMutationError(error: unknown, meta?: Record<string, unknown>) {
  const serialized = serializeError(error)
  reportObservabilityEvent({
    type: 'mutation_error',
    level: 'warn',
    message: serialized?.message ?? 'Mutation failed',
    requestId: serialized?.requestId,
    error: serialized,
    extra: meta
  })
}

export function reportHttpError(error: unknown, meta?: Record<string, unknown>) {
  const serialized = serializeError(error)
  reportObservabilityEvent({
    type: 'http_error',
    level: serialized?.status && serialized.status >= 500 ? 'error' : 'warn',
    message: serialized?.message ?? 'HTTP request failed',
    requestId: serialized?.requestId,
    error: serialized,
    extra: meta
  })
}

export function reportConnectivityChange(online: boolean) {
  reportObservabilityEvent({
    type: online ? 'online' : 'offline',
    level: online ? 'info' : 'warn',
    message: online ? 'Connectivity restored' : 'Browser is offline',
    extra: { online }
  })
}

export function updateLastBackendRequestId(requestId?: string) {
  if (requestId && requestId.trim()) {
    lastBackendRequestId = requestId.trim()
  }
}
