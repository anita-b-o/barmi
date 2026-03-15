import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authAdapter } from '../../api/adapters/authAdapter'
import type { AuthMe } from '../../api/contracts/v1/auth'
import { isApiError } from '../api'
import type { AuthRequestContext } from '../api'
import { clearSession, loadSession, saveSession, type AuthSession } from './sessionStorage'

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
}

const AuthContext = createContext<AuthContextValue | null>(null)

const emptyMemberships: AuthMe['memberships'] = { stores: [], ecosystems: [] }

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [me, setMe] = useState<AuthMe | null>(null)
  const [loading, setLoading] = useState<boolean>(!!session)
  const [error, setError] = useState<string | null>(null)
  const refreshInFlight = useRef<Promise<string | null> | null>(null)
  const sessionRef = useRef<AuthSession | null>(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const setSessionState = useCallback((next: AuthSession | null) => {
    sessionRef.current = next
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSessionState(null)
    setMe(null)
    setError(null)
  }, [setSessionState])

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current
    const current = sessionRef.current
    if (!current?.refreshToken) return null

    const task = (async () => {
      try {
        setLoading(true)
        const tokens = await authAdapter.refresh({ refreshToken: current.refreshToken })
        saveSession(tokens)
        setSessionState(tokens)
        return tokens.accessToken
      } catch (err) {
        logout()
        setError(toErrorMessage(err))
        return null
      } finally {
        setLoading(false)
        refreshInFlight.current = null
      }
    })()

    refreshInFlight.current = task
    return task
  }, [logout, setSessionState])

  const authRequestContext: AuthRequestContext = useMemo(() => ({
    getAccessToken: () => sessionRef.current?.accessToken ?? null,
    refresh,
    onRefreshFailure: logout
  }), [logout, refresh])

  const loadMe = useCallback(async () => {
    try {
      setLoading(true)
      const profile = await authAdapter.me(authRequestContext)
      setMe(profile)
      setError(null)
    } catch (err) {
      logout()
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [authRequestContext, logout])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    loadMe()
  }, [session, loadMe])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      const tokens = await authAdapter.login({ email, password })
      saveSession(tokens)
      setSessionState(tokens)
      await loadMe()
      return true
    } catch (err) {
      logout()
      setError(toErrorMessage(err))
      return false
    } finally {
      setLoading(false)
    }
  }, [loadMe, logout, setSessionState])

  const value = useMemo<AuthContextValue>(() => ({
    login,
    logout,
    refresh,
    isAuthenticated: !!session?.accessToken,
    me,
    memberships: me?.memberships ?? emptyMemberships,
    authRequest: authRequestContext,
    loading,
    error
  }), [authRequestContext, error, loading, login, logout, me, refresh, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
