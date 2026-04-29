import { theme } from './theme'

export type VisualContext = 'neutral' | 'store' | 'ecosystem' | 'admin'

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map((char) => `${char}${char}`).join('')
    : value

  const parsed = Number.parseInt(normalized, 16)
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  }
}

export function alpha(hex: string, opacity: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function getContextPalette(context: VisualContext) {
  if (context === 'store') {
    return {
      accent: theme.colors.brand,
      accentHover: theme.colors.actionHover,
      soft: alpha(theme.colors.brand, 0.16),
      contrast: '#FFFFFF'
    }
  }

  if (context === 'ecosystem') {
    return {
      accent: theme.colors.brand,
      accentHover: theme.colors.actionHover,
      soft: alpha(theme.colors.brand, 0.14),
      contrast: '#FFFFFF'
    }
  }

  if (context === 'admin') {
    return {
      accent: theme.colors.textPrimary,
      accentHover: theme.colors.textPrimary,
      soft: theme.colors.bgHover,
      contrast: '#FFFFFF'
    }
  }

  return {
    accent: theme.colors.brand,
    accentHover: theme.colors.actionHover,
    soft: alpha(theme.colors.brand, 0.16),
    contrast: '#FFFFFF'
  }
}
