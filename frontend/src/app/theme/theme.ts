import { tokens } from './tokens'

export type ResolvedTheme = 'light' | 'dark'
export type ThemeMode = ResolvedTheme
export type ThemePreference = 'system' | ResolvedTheme

export function getTheme(mode: ResolvedTheme = 'light') {
  const palette = mode === 'dark' ? tokens.colors.dark : tokens.colors.light
  return {
    mode,
    colors: palette,
    spacing: tokens.spacing,
    radius: tokens.radius,
    shadows: tokens.shadows,
    typography: tokens.typography,
    breakpoints: tokens.breakpoints
  }
}

type ThemeShape = ReturnType<typeof getTheme>

let currentMode: ResolvedTheme = 'light'
let currentTheme = getTheme(currentMode)
const subscribers = new Set<(mode: ResolvedTheme) => void>()

function syncDocumentTheme(mode: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
}

export function getThemeMode() {
  return currentMode
}

export function setThemeMode(mode: ResolvedTheme) {
  if (mode === currentMode) {
    syncDocumentTheme(mode)
    return
  }

  currentMode = mode
  currentTheme = getTheme(mode)
  syncDocumentTheme(mode)
  subscribers.forEach((listener) => listener(mode))
}

export function subscribeThemeMode(listener: (mode: ResolvedTheme) => void) {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

export const theme = new Proxy({} as ThemeShape, {
  get(_, property) {
    return currentTheme[property as keyof ThemeShape]
  }
})
