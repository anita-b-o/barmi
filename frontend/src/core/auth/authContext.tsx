import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authAdapter } from '../../api/adapters/authAdapter'
import type { AuthMe } from '../../api/contracts/v1/auth'
import { isApiError } from '../api'
import type { AuthRequestContext } from '../api'
import { trackBetaEvent } from '@/core/beta/client'
import { clearSession, loadSession, saveSession, type AuthSession } from './sessionStorage'
import { isRetryableApiError } from '@/api/client/http'

type AuthContextValue = {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  refresh: () => Promise<string | null>
  isAuthenticated: boolean
  me: AuthMe | null
  memberships: AuthMe['memberships']
  authRequest: AuthRequestContext
  loading: boolean
  error: string | null
  sessionNotice: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const emptyMemberships: AuthMe['memberships'] = { stores: [], ecosystems: [] }

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'invalid_credentials') return 'Email o contraseña inválidos.'
    if (error.code === 'concurrent_auth_request') return 'Ya se abrió una sesión en otra pestaña. Reintentá.'
    if (error.code === 'refresh_token_expired') return 'Tu sesión expiró.'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

function isUnauthorizedError(error: unknown) {
  return isApiError(error) && error.status === 401
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [me, setMe] = useState<AuthMe | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const refreshInFlight = useRef<Promise<string | null> | null>(null)
  const sessionRef = useRef<AuthSession | null>(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const setSessionState = useCallback((next: AuthSession | null) => {
    sessionRef.current = next
    setSession(next)
  }, [])

  const clearAuthState = useCallback(() => {
    clearSession()
    setSessionState(null)
    setMe(null)
  }, [setSessionState])

  const logout = useCallback(() => {
    if (sessionRef.current?.accessToken) {
      trackBetaEvent({ eventName: 'logout' })
    }
    clearAuthState()
    setError(null)
    setSessionNotice(null)
    setLoading(false)
    void authAdapter.logout().catch(() => undefined)
  }, [clearAuthState])

  const refresh = useCallback(async (silent = false) => {
    if (refreshInFlight.current) return refreshInFlight.current

    const task = (async () => {
      try {
        setLoading(true)
        const tokens = await authAdapter.refresh()
        saveSession(tokens)
        setSessionState(tokens)
        setError(null)
        setSessionNotice(null)
        return tokens.accessToken
      } catch (err) {
        if (isUnauthorizedError(err)) {
          clearAuthState()
          if (!silent) {
            setError('Tu sesión expiró.')
            setSessionNotice('Tu sesión expiró. Volvé a ingresar y te devolvemos al paso donde estabas.')
          }
          return null
        }

        if (silent) {
          return null
        }

        if (!silent) {
          setError(isRetryableApiError(err) ? 'Reconectando con el servidor...' : toErrorMessage(err))
        }
        throw err
      } finally {
        setLoading(false)
        refreshInFlight.current = null
      }
    })()

    refreshInFlight.current = task
    return task
  }, [clearAuthState, setSessionState])

  const authRequestContext: AuthRequestContext = useMemo(() => ({
    getAccessToken: () => sessionRef.current?.accessToken ?? null,
    refresh
  }), [refresh])

  const loadMe = useCallback(async () => {
    try {
      setLoading(true)
      const profile = await authAdapter.me(authRequestContext)
      setMe(profile)
      setError(null)
      setSessionNotice(null)
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearAuthState()
        setError('Tu sesión expiró.')
        setSessionNotice('Tu sesión expiró. Volvé a ingresar y te devolvemos al paso donde estabas.')
        return
      }

      setError(isRetryableApiError(err) ? 'Reconectando con el servidor...' : toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [authRequestContext, clearAuthState])

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      if (sessionRef.current?.accessToken) {
        await loadMe()
        return
      }

      const restoredSession = loadSession()
      if (restoredSession) {
        setSessionState(restoredSession)
        return
      }

      const restoredToken = await refresh(true)
      if (!restoredToken && !cancelled) {
        setLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [loadMe, refresh, setSessionState])

  useEffect(() => {
    if (!session) return
    void loadMe()
  }, [session, loadMe])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      setSessionNotice(null)
      const tokens = await authAdapter.login({ email, password })
      saveSession(tokens)
      setSessionState(tokens)
      await loadMe()
      trackBetaEvent({ eventName: 'login_success' })
      return true
    } catch (err) {
      clearAuthState()
      setError(toErrorMessage(err))
      trackBetaEvent({
        eventName: 'login_failure',
        metadata: {
          surface: 'login_form',
          reason: isApiError(err) ? err.code : 'unknown'
        }
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [clearAuthState, loadMe, setSessionState])

  const value = useMemo<AuthContextValue>(() => ({
    login,
    logout,
    refresh,
    isAuthenticated: !!session?.accessToken,
    me,
    memberships: me?.memberships ?? emptyMemberships,
    authRequest: authRequestContext,
    loading,
    error,
    sessionNotice
  }), [authRequestContext, error, loading, login, logout, me, refresh, session, sessionNotice])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
