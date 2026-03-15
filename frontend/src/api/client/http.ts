import { ApiError, isApiError } from './errors'

export type HttpClientOptions = {
  baseUrl?: string
  fetchFn?: typeof fetch
}

export type AuthRequestContext = {
  getAccessToken: () => string | null
  refresh: () => Promise<string | null>
  onRefreshFailure?: () => void
}

export async function requestJson<T>(path: string, init: RequestInit = {}, options: HttpClientOptions = {}): Promise<T> {
  const baseUrl = options.baseUrl ?? ''
  const fetchFn = options.fetchFn ?? fetch
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetchFn(`${baseUrl}${path}`, {
    ...init,
    headers
  })

  const text = await response.text()
  const hasBody = text.trim().length > 0
  const data = hasBody ? JSON.parse(text) : null

  if (!response.ok) {
    const envelope = data && typeof data === 'object' ? (data as { error?: unknown }) : null
    const errorCandidate = envelope?.error
    if (errorCandidate && isApiError(errorCandidate)) {
      throw errorCandidate
    }

    const fallback: ApiError = {
      code: 'http_error',
      message: `HTTP ${response.status}`,
      status: response.status
    }
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
      auth.onRefreshFailure?.()
      throw err
    }

    return await requestJson<T>(path, withAuthHeader(init, refreshedToken), options)
  }
}
