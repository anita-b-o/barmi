export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536
} as const

const rawColors = {
  primary400: '#FD746B',
  primary500: '#F65F55',
  primary600: '#E5544A',
  bgPageDark900: '#1F2A44',
  bgSurfaceDark800: '#273451',
  bgHoverDark700: '#3A4B6E',
  borderDark600: '#4A5C85',
  bgPageLight100: '#F6F7F9',
  bgSurfaceLight200: '#E4E8EF',
  borderDefault300: '#D1D7E0',
  borderStrong400: '#9FA8B8',
  textPrimaryLight: '#111827',
  textSecondaryLight: '#374151',
  textMutedLight: '#6B7280',
  textPrimaryDark: '#F5F7FA',
  textSecondaryDark: '#C7CEDB',
  textMutedDark: '#8A94A6',
  success: '#2DB39A',
  warning: '#D9972F',
  error: '#F65F55',
  info: '#3A8EEC',
  white: '#FFFFFF',
  focusRing: 'rgba(246, 95, 85, 0.4)'
} as const

export const colors = {
  light: {
    brand: rawColors.primary400,
    actionPrimary: rawColors.primary500,
    actionHover: rawColors.primary600,
    actionDisabled: rawColors.borderDefault300,
    focusRing: rawColors.focusRing,
    bgPage: rawColors.bgPageLight100,
    bgSurface: rawColors.bgSurfaceLight200,
    bgSurfaceAlt: rawColors.white,
    bgHover: rawColors.bgPageLight100,
    bgSelected: rawColors.bgPageLight100,
    bgAccentSoft: 'rgba(253, 116, 107, 0.12)',
    borderDefault: rawColors.borderDefault300,
    borderStrong: rawColors.borderStrong400,
    borderHover: rawColors.borderStrong400,
    borderAccentSoft: 'rgba(253, 116, 107, 0.32)',
    textPrimary: rawColors.textPrimaryLight,
    textSecondary: rawColors.textSecondaryLight,
    textMuted: rawColors.textMutedLight,
    success: rawColors.success,
    warning: rawColors.warning,
    error: rawColors.error,
    info: rawColors.info,
    statusSuccessSoft: 'rgba(45, 179, 154, 0.12)',
    statusWarningSoft: 'rgba(217, 151, 47, 0.14)',
    statusErrorSoft: 'rgba(246, 95, 85, 0.12)',
    statusInfoSoft: 'rgba(58, 142, 236, 0.12)',
    primary: rawColors.primary500,
    primarySoft: 'rgba(253, 116, 107, 0.12)',
    secondary: rawColors.textPrimaryLight,
    accent: rawColors.primary400,
    text: rawColors.textPrimaryLight,
    surface: rawColors.bgSurfaceLight200,
    border: rawColors.borderDefault300
  },
  dark: {
    brand: rawColors.primary400,
    actionPrimary: rawColors.primary500,
    actionHover: rawColors.primary600,
    actionDisabled: rawColors.borderDark600,
    focusRing: rawColors.focusRing,
    bgPage: rawColors.bgPageDark900,
    bgSurface: rawColors.bgSurfaceDark800,
    bgSurfaceAlt: rawColors.bgSurfaceDark800,
    bgHover: rawColors.bgHoverDark700,
    bgSelected: rawColors.bgHoverDark700,
    bgAccentSoft: 'rgba(253, 116, 107, 0.16)',
    borderDefault: rawColors.borderDark600,
    borderStrong: rawColors.borderStrong400,
    borderHover: rawColors.borderStrong400,
    borderAccentSoft: 'rgba(253, 116, 107, 0.4)',
    borderDark: rawColors.borderDark600,
    textPrimary: rawColors.textPrimaryDark,
    textSecondary: rawColors.textSecondaryDark,
    textMuted: rawColors.textMutedDark,
    success: rawColors.success,
    warning: rawColors.warning,
    error: rawColors.error,
    info: rawColors.info,
    statusSuccessSoft: 'rgba(45, 179, 154, 0.18)',
    statusWarningSoft: 'rgba(217, 151, 47, 0.2)',
    statusErrorSoft: 'rgba(246, 95, 85, 0.18)',
    statusInfoSoft: 'rgba(58, 142, 236, 0.18)',
    primary: rawColors.primary500,
    primarySoft: 'rgba(253, 116, 107, 0.16)',
    secondary: rawColors.textPrimaryDark,
    accent: rawColors.primary400,
    text: rawColors.textPrimaryDark,
    surface: rawColors.bgSurfaceDark800,
    border: rawColors.borderDark600
  }
} as const

export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  pill: 0
} as const

export const shadows = {
  soft: 'none',
  medium: 'none',
  glass: 'none'
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48
} as const

export const typography = {
  fontFamily: 'Arial, sans-serif',
  display: {
    size: 32,
    weight: 700
  },
  title: {
    size: 22,
    weight: 600
  },
  body: {
    size: 15,
    weight: 400
  },
  small: {
    size: 12,
    weight: 400
  }
} as const

export const tokens = {
  rawColors,
  colors,
  spacing,
  radius,
  shadows,
  typography,
  breakpoints
} as const
