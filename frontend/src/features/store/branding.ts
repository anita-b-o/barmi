import type { CSSProperties } from 'react'
import { theme } from '@/app/theme'
import { tokens } from '@/app/theme/tokens'
import type { PublicStoreBranding } from '@/api/contracts/v1/public'
import type { StoreBranding } from '@/api/contracts/v1/storeAdmin'

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

export const defaultStoreBranding = {
  logoUrl: null,
  bannerUrl: null,
  primaryColor: theme.colors.actionPrimary,
  secondaryColor: theme.colors.actionHover
}

export function isHexColor(value: string) {
  return HEX_COLOR_PATTERN.test(value)
}

function channel(hex: string, start: number) {
  return Number.parseInt(hex.slice(start, start + 2), 16) / 255
}

function linearize(value: number) {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const r = linearize(channel(hex, 1))
  const g = linearize(channel(hex, 3))
  const b = linearize(channel(hex, 5))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string) {
  const l1 = luminance(a)
  const l2 = luminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function readableTextColor(background: string) {
  if (!isHexColor(background)) return theme.colors.bgSurfaceAlt
  const light = tokens.rawColors.white
  const dark = tokens.rawColors.textPrimaryLight
  return contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark
}

export function normalizeStoreBranding(branding?: Partial<PublicStoreBranding | StoreBranding> | null) {
  const primaryColor = branding?.primaryColor && isHexColor(branding.primaryColor)
    ? branding.primaryColor
    : theme.colors.actionPrimary
  const secondaryColor = branding?.secondaryColor && isHexColor(branding.secondaryColor)
    ? branding.secondaryColor
    : theme.colors.actionHover
  return {
    logoUrl: branding?.logoUrl?.trim() || null,
    bannerUrl: branding?.bannerUrl?.trim() || null,
    primaryColor,
    secondaryColor,
    primaryContrast: readableTextColor(primaryColor),
    secondaryContrast: readableTextColor(secondaryColor)
  }
}

export function storeBrandingCssVariables(branding?: Partial<PublicStoreBranding | StoreBranding> | null): CSSProperties {
  const normalized = normalizeStoreBranding(branding)
  return {
    '--store-primary': normalized.primaryColor,
    '--store-secondary': normalized.secondaryColor,
    '--store-primary-contrast': normalized.primaryContrast,
    '--store-secondary-contrast': normalized.secondaryContrast
  } as CSSProperties
}
