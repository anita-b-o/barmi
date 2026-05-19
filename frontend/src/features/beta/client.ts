import { appConfig } from '@/app/config/env'
import { getLastBackendRequestId } from '@/app/observability/client'
import { releaseMetadata } from '@/app/observability/release'

export type BetaTelemetryEventName =
  | 'ecosystem_home_view'
  | 'catalog_view'
  | 'map_view'
  | 'store_view'
  | 'search_used'
  | 'product_click'
  | 'store_click'
  | 'map_pin_click'
  | 'checkout_started'
  | 'payment_initiated'
  | 'checkout_success'
  | 'checkout_failure'
  | 'login_success'
  | 'login_failure'
  | 'logout'

type BetaTelemetryPayload = {
  eventName: BetaTelemetryEventName
  storeId?: string
  storeSlug?: string
  storeName?: string
  ecosystemSlug?: string
  productId?: string
  searchTerm?: string
  requestId?: string
  metadata?: Record<string, string>
}

const SESSION_STORAGE_KEY = 'barmi.beta.session_id'

function currentRoute() {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function createIdentifier() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `beta-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

function getSessionId() {
  if (typeof window === 'undefined') return 'server'
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing
  const next = createIdentifier()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

function sanitizeText(value: string | undefined, maxLength: number) {
  if (!value) return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  return normalized.slice(0, maxLength)
}

function buildBody(payload: BetaTelemetryPayload) {
  return JSON.stringify({
    eventName: payload.eventName,
    storeId: sanitizeText(payload.storeId, 120),
    storeSlug: sanitizeText(payload.storeSlug, 120),
    storeName: sanitizeText(payload.storeName, 160),
    ecosystemSlug: sanitizeText(payload.ecosystemSlug, 120),
    productId: sanitizeText(payload.productId, 120),
    searchTerm: sanitizeText(payload.searchTerm, 120),
    requestId: sanitizeText(payload.requestId ?? getLastBackendRequestId(), 120),
    sessionId: getSessionId(),
    route: currentRoute(),
    releaseId: releaseMetadata.releaseId,
    environment: appConfig.appEnv,
    occurredAt: new Date().toISOString(),
    metadata: payload.metadata
  })
}

export function getBetaClientContext() {
  return {
    sessionId: getSessionId(),
    route: currentRoute(),
    releaseId: releaseMetadata.releaseId,
    environment: appConfig.appEnv,
    requestId: getLastBackendRequestId()
  }
}

export function trackBetaEvent(payload: BetaTelemetryPayload) {
  if (typeof window === 'undefined') return

  const body = buildBody(payload)

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/public/beta/telemetry', blob)
      return
    }

    void fetch('/api/public/beta/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => undefined)
  } catch {
    // Telemetry must stay best-effort.
  }
}
