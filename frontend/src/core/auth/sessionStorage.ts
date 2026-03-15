import type { AuthTokenResponse } from '../../api/contracts/v1/auth'

const STORAGE_KEY = 'barmi.auth.session.v1'

export type AuthSession = AuthTokenResponse

export function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed || typeof parsed !== 'object') return null
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.tokenType !== 'string' ||
      typeof parsed.expiresAt !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
