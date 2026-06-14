import { appConfig } from '@/app/config/env'

type MutableRecord = Record<string, unknown>
export type SentryPolicyEvent = MutableRecord & {
  request?: unknown
  contexts?: unknown
  extra?: unknown
  tags?: Record<string, string>
}

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'ecosystem', 'public'])
const SENSITIVE_KEY_PATTERN = /(authorization|cookie|token|secret|password|passwd|jwt|credential|session|set-cookie|x-api-key)/i
const TOKEN_VALUE_PATTERN = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi
const JWT_VALUE_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
const MAX_DEPTH = 5

export function sanitizeRoute(pathname: string) {
  const normalized = pathname.trim()
  if (!normalized) return '/'
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function sanitizeUrlForTelemetry(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${sanitizeRoute(parsed.pathname)}`
  } catch {
    return sanitizeRoute(url.split('?')[0]?.split('#')[0] ?? '/')
  }
}

export function redactSensitiveString(value: string) {
  return value
    .replace(TOKEN_VALUE_PATTERN, '$1[Filtered]')
    .replace(JWT_VALUE_PATTERN, '[Filtered]')
    .replace(/([?&](?:access_token|refresh_token|id_token|token|jwt|secret|password)=)[^&#]+/gi, '$1[Filtered]')
}

function isRecord(value: unknown): value is MutableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function sanitizeForSentry(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[Truncated]'
  if (typeof value === 'string') return redactSensitiveString(value)
  if (typeof value !== 'object' || value === null) return value
  if (Array.isArray(value)) return value.map((item) => sanitizeForSentry(item, depth + 1))

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[Filtered]' : sanitizeForSentry(child, depth + 1)
    ])
  )
}

function slugFromPublicStoreRoute(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return segments[0] === 'public' && segments[1] ? segments[1] : undefined
}

function slugFromHost(hostname: string) {
  const hostWithoutPort = hostname.toLowerCase().split(':')[0]
  const segments = hostWithoutPort.split('.').filter(Boolean)
  const subdomain = segments.length > 2 ? segments[0] : undefined
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return undefined
  return subdomain
}

export function deriveSentryContextFromLocation(location: Pick<Location, 'hostname' | 'pathname'>) {
  const route = sanitizeRoute(location.pathname)
  const storeSlug = slugFromPublicStoreRoute(route) ?? slugFromHost(location.hostname)
  const ecosystemSlug = route.startsWith('/ecosystem') || route.startsWith('/admin/ecosystem')
    ? appConfig.publicEcosystemSlug
    : undefined

  return {
    route,
    tags: {
      app_env: appConfig.appEnv,
      release_id: appConfig.appReleaseId,
      ...(storeSlug ? { store_slug: storeSlug } : {}),
      ...(ecosystemSlug ? { ecosystem_slug: ecosystemSlug } : {})
    }
  }
}

export function shouldDropSentryEvent(route?: string) {
  return sanitizeRoute(route ?? '') === '/__observability' && !appConfig.sentrySmokeEnabled
}

export function sanitizeSentryEvent<T extends SentryPolicyEvent>(event: T): T {
  const sanitized = { ...event }

  if (isRecord(sanitized.request)) {
    sanitized.request = sanitizeForSentry({
      ...sanitized.request,
      url: typeof sanitized.request.url === 'string'
        ? sanitizeUrlForTelemetry(sanitized.request.url)
        : sanitized.request.url,
      query_string: typeof sanitized.request.query_string === 'string'
        ? redactSensitiveString(sanitized.request.query_string)
        : sanitized.request.query_string
    })
  }
  if (isRecord(sanitized.contexts)) {
    sanitized.contexts = sanitizeForSentry(sanitized.contexts)
  }
  if (isRecord(sanitized.extra)) {
    sanitized.extra = sanitizeForSentry(sanitized.extra)
  }

  return sanitized
}
