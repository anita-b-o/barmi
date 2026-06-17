import { reportHttpError, updateLastBackendRequestId } from '@/app/observability/client'
import { emitBackendConnectionState } from '@/app/connection/backendConnection'
import { ApiError, isApiError } from './errors'

export type HttpClientOptions = {
  baseUrl?: string
  fetchFn?: typeof fetch
  transientRetry?: 'auto' | 'always' | 'never'
}

export type AuthRequestContext = {
  getAccessToken: () => string | null
  refresh: () => Promise<string | null>
}

const RETRYABLE_STATUSES = new Set([502, 503])
const RETRY_DELAYS_MS = [250, 750, 1500]
const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

function parseJsonSafely(text: string) {
  if (text.trim().length === 0) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function getHeaderValue(response: Response, name: string) {
  const headers = response.headers
  if (!headers || typeof headers.get !== 'function') return null
  return headers.get(name)
}

function pathForTelemetry(path: string) {
  try {
    return new URL(path, typeof window === 'undefined' ? 'http://localhost' : window.location.origin).pathname
  } catch {
    return path
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function transientServerMessage() {
  return 'Estamos reconectando con el servidor. Reintentá en unos segundos.'
}

function shouldRetryRequest(method: string, options: HttpClientOptions) {
  if (options.transientRetry === 'always') return true
  if (options.transientRetry === 'never') return false
  return SAFE_RETRY_METHODS.has(method.toUpperCase())
}

export function isRetryableApiError(error: unknown) {
  return isApiError(error) && (error.status === 0 || RETRYABLE_STATUSES.has(error.status))
}

function notifyReconnecting(path: string, status?: number) {
  emitBackendConnectionState({
    state: 'reconnecting',
    path: pathForTelemetry(path),
    status
  })
}

function notifyRecovered(path: string, status?: number) {
  emitBackendConnectionState({
    state: 'recovered',
    path: pathForTelemetry(path),
    status
  })
}

export async function requestJson<T>(path: string, init: RequestInit = {}, options: HttpClientOptions = {}): Promise<T> {
  return requestJsonAttempt<T>(path, init, options, 0)
}

async function requestJsonAttempt<T>(
  path: string,
  init: RequestInit = {},
  options: HttpClientOptions = {},
  attempt: number
): Promise<T> {
  const baseUrl = options.baseUrl ?? ''
  const fetchFn = options.fetchFn ?? fetch
  const headers = new Headers(init.headers)
  const method = (init.method ?? 'GET').toUpperCase()
  const retryEnabled = shouldRetryRequest(method, options)

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (!headers.has('X-Request-Id')) {
    headers.set('X-Request-Id', createRequestId())
  }

  let response: Response
  try {
    response = await fetchFn(`${baseUrl}${path}`, {
      ...init,
      headers
    })
  } catch (error) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (!offline && retryEnabled && attempt < RETRY_DELAYS_MS.length) {
      notifyReconnecting(path)
      await sleep(RETRY_DELAYS_MS[attempt])
      const retried = await requestJsonAttempt<T>(path, init, options, attempt + 1)
      notifyRecovered(path)
      return retried
    }

    const networkError: ApiError = {
      code: offline ? 'offline' : 'network_error',
      message: offline ? 'Sin conexión a internet' : transientServerMessage(),
      status: 0,
      requestId: headers.get('X-Request-Id') ?? undefined,
      cause: error instanceof Error ? error.message : undefined
    }
    updateLastBackendRequestId(networkError.requestId)
    reportHttpError(networkError, {
      path: pathForTelemetry(path),
      method,
      phase: 'fetch'
    })
    throw networkError
  }

  const text = await response.text()
  const data = parseJsonSafely(text)
  const responseRequestId = getHeaderValue(response, 'X-Request-Id') ?? headers.get('X-Request-Id') ?? undefined
  updateLastBackendRequestId(responseRequestId)

  if (!response.ok) {
    const envelope = data && typeof data === 'object' ? (data as { error?: unknown }) : null
    const errorCandidate = envelope?.error
    if (errorCandidate && isApiError(errorCandidate)) {
      const apiError = {
        ...errorCandidate,
        message: RETRYABLE_STATUSES.has(errorCandidate.status) ? transientServerMessage() : errorCandidate.message,
        requestId: errorCandidate.requestId ?? responseRequestId
      } satisfies ApiError
      if (RETRYABLE_STATUSES.has(apiError.status) && retryEnabled && attempt < RETRY_DELAYS_MS.length) {
        notifyReconnecting(path, apiError.status)
        await sleep(RETRY_DELAYS_MS[attempt])
        const retried = await requestJsonAttempt<T>(path, init, options, attempt + 1)
        notifyRecovered(path, apiError.status)
        return retried
      }
      reportHttpError(apiError, {
        path: pathForTelemetry(path),
        method,
        responseStatus: response.status
      })
      throw apiError
    }

    const fallback: ApiError = {
      code: 'http_error',
      message: RETRYABLE_STATUSES.has(response.status) ? transientServerMessage() : `HTTP ${response.status}`,
      status: response.status,
      requestId: responseRequestId
    }
    if (RETRYABLE_STATUSES.has(fallback.status) && retryEnabled && attempt < RETRY_DELAYS_MS.length) {
      notifyReconnecting(path, fallback.status)
      await sleep(RETRY_DELAYS_MS[attempt])
      const retried = await requestJsonAttempt<T>(path, init, options, attempt + 1)
      notifyRecovered(path, fallback.status)
      return retried
    }
    reportHttpError(fallback, {
      path: pathForTelemetry(path),
      method,
      responseStatus: response.status
    })
    throw fallback
  }

  return data as T
}

function withAuthHeader(init: RequestInit, token: string | null): RequestInit {
  if (!token) return init
  const headers = new Headers(init.headers)
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return {
    ...init,
    headers
  }
}

export async function requestJsonWithAuth<T>(
  path: string,
  init: RequestInit = {},
  options: HttpClientOptions = {},
  auth: AuthRequestContext
): Promise<T> {
  const token = auth.getAccessToken()
  try {
    return await requestJson<T>(path, withAuthHeader(init, token), options)
  } catch (err) {
    const isUnauthorized = typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 401
    if (!isUnauthorized) throw err

    const refreshedToken = await auth.refresh()
    if (!refreshedToken) {
      throw err
    }

    return await requestJson<T>(path, withAuthHeader(init, refreshedToken), options)
  }
}
