import { breakpoints } from './breakpoints'
import { colors } from './colors'
import { radius } from './radius'
import { shadows } from './shadows'
import { spacing } from './spacing'
import { typography } from './typography'

export { breakpoints, colors, radius, shadows, spacing, typography }

export const tokens = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  breakpoints
} as const
