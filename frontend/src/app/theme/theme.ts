import { tokens } from './tokens'

export type ThemeMode = 'light' | 'dark'

export function getTheme(mode: ThemeMode = 'light') {
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

let currentMode: ThemeMode = 'light'
let currentTheme = getTheme(currentMode)
const subscribers = new Set<(mode: ThemeMode) => void>()

function syncDocumentTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
}

export function getThemeMode() {
  return currentMode
}

export function setThemeMode(mode: ThemeMode) {
  if (mode === currentMode) {
    syncDocumentTheme(mode)
    return
  }

  currentMode = mode
  currentTheme = getTheme(mode)
  syncDocumentTheme(mode)
  subscribers.forEach((listener) => listener(mode))
}

export function subscribeThemeMode(listener: (mode: ThemeMode) => void) {
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
