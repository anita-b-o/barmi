import { tokens } from '../../design-system/tokens'

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

export const theme = getTheme('light')
