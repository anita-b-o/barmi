import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getThemeMode, setThemeMode, subscribeThemeMode, theme, type ResolvedTheme, type ThemeMode, type ThemePreference } from './theme'

export const THEME_STORAGE_KEY = 'barmi-theme-mode'

type ThemeModeContextValue = {
  mode: ResolvedTheme
  resolvedTheme: ResolvedTheme
  themePreference: ThemePreference
  setMode: (mode: ThemeMode) => void
  setThemePreference: (preference: ThemePreference) => void
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'

  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(storedPreference) ? storedPreference : 'system'
}

function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(readInitialPreference)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)
  const [mode, setModeState] = useState<ResolvedTheme>(() => resolveTheme(readInitialPreference(), getSystemTheme()))
  const resolvedTheme = resolveTheme(themePreference, systemTheme)

  useEffect(() => {
    setModeState(resolvedTheme)
    setThemeMode(resolvedTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference)
    }
  }, [resolvedTheme, themePreference])

  useEffect(() => subscribeThemeMode(setModeState), [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    resolvedTheme,
    themePreference,
    setMode: (nextMode) => setThemePreferenceState(nextMode),
    setThemePreference: (nextPreference) => setThemePreferenceState(nextPreference),
    toggleMode: () => setThemePreferenceState((current) => (resolveTheme(current, systemTheme) === 'light' ? 'dark' : 'light'))
  }), [mode, resolvedTheme, systemTheme, themePreference])

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider')
  }
  return context
}

export function useActiveThemeMode() {
  return useThemeMode().resolvedTheme
}

export function useTheme() {
  const context = useThemeMode()
  return {
    theme,
    themePreference: context.themePreference,
    resolvedTheme: context.resolvedTheme,
    setThemePreference: context.setThemePreference
  }
}

export const ThemeProvider = ThemeModeProvider
