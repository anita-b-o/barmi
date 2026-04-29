import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getThemeMode, setThemeMode, subscribeThemeMode, type ThemeMode } from './theme'

const STORAGE_KEY = 'barmi-theme-mode'

type ThemeModeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

function resolveInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'

  const storedMode = window.localStorage.getItem(STORAGE_KEY)
  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const initialMode = resolveInitialThemeMode()
    setThemeMode(initialMode)
    return initialMode
  })

  useEffect(() => {
    setThemeMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode)
    }
  }, [mode])

  useEffect(() => subscribeThemeMode(setModeState), [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      const storedMode = window.localStorage.getItem(STORAGE_KEY)
      if (storedMode === 'light' || storedMode === 'dark') return
      setModeState(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    setMode: setModeState,
    toggleMode: () => setModeState((current) => (current === 'light' ? 'dark' : 'light'))
  }), [mode])

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
  return useThemeMode().mode
}
