import type { CSSProperties } from 'react'
import { alpha, theme } from '@/app/theme'
import { hasPublicStoreCapability } from '@/api/adapters/publicAdapter'
import { normalizeStoreBranding } from '@/features/store/branding'
import {
  getStorefrontPalette,
  getStorefrontPresetMetadata,
  getStorefrontShape,
  storefrontPaletteRegistry,
  storefrontShapeRegistry
} from './storefrontPresetRegistry'
import type { ResolvedStorefrontAppearance, StorefrontMode, StorefrontThemeResolverInput } from './types'

function descriptionHighlights(description: string | null | undefined) {
  if (!description) return []

  return description
    .split(/[.,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12)
    .slice(0, 4)
}

function resolveStorefrontMode(input: StorefrontThemeResolverInput, preset: ResolvedStorefrontAppearance['preset']): StorefrontMode {
  if (hasPublicStoreCapability(input.capabilities, 'PRODUCTS')) return 'commerce'
  if (preset === 'PORTFOLIO') return 'portfolio'
  if (preset === 'CLASSIC') return 'services'
  return 'profile'
}

function trustSignals(input: StorefrontThemeResolverInput, mode: StorefrontMode, profileHighlights: string[]) {
  const productsEnabled = hasPublicStoreCapability(input.capabilities, 'PRODUCTS')
  const checkoutEnabled = hasPublicStoreCapability(input.capabilities, 'CHECKOUT')
  const shippingEnabled = hasPublicStoreCapability(input.capabilities, 'SHIPPING')
  const promotionsEnabled = hasPublicStoreCapability(input.capabilities, 'PROMOTIONS')
  const contactEnabled = hasPublicStoreCapability(input.capabilities, 'CONTACT')
  const productsTotal = input.catalog?.productsTotal ?? null
  const categoriesCount = input.catalog?.categoriesCount ?? 0
  const promotionsCount = input.catalog?.promotionsCount ?? 0
  const hasCatalogFilters = Boolean(input.catalog?.hasCatalogFilters)
  const contactsCount = input.contacts?.count ?? 0

  return [
    productsEnabled ? {
      label: 'Catálogo',
      value: productsTotal !== null && !hasCatalogFilters
        ? `${productsTotal} producto${productsTotal === 1 ? '' : 's'} publicado${productsTotal === 1 ? '' : 's'}`
        : 'Productos con precio y disponibilidad'
    } : null,
    productsEnabled && categoriesCount > 0 ? {
      label: 'Categorías',
      value: `${categoriesCount} categoría${categoriesCount === 1 ? '' : 's'} para explorar`
    } : null,
    productsEnabled && checkoutEnabled ? {
      label: 'Compra',
      value: 'Pedido online con validación de stock al finalizar'
    } : null,
    productsEnabled && shippingEnabled ? {
      label: 'Entrega',
      value: 'Opciones de envío disponibles en checkout'
    } : null,
    productsEnabled && promotionsEnabled && checkoutEnabled && promotionsCount > 0 ? {
      label: 'Promociones',
      value: `${promotionsCount} código${promotionsCount === 1 ? '' : 's'} activo${promotionsCount === 1 ? '' : 's'}`
    } : null,
    !productsEnabled && profileHighlights.length > 0 ? {
      label: mode === 'portfolio' ? 'Perfil' : 'Especialidad',
      value: profileHighlights[0]
    } : null,
    contactEnabled && contactsCount > 0 ? {
      label: 'Contacto',
      value: `${contactsCount} canal${contactsCount === 1 ? '' : 'es'} disponible${contactsCount === 1 ? '' : 's'}`
    } : null
  ].filter((item): item is { label: string; value: string } => item !== null)
}

export function resolveStorefrontAppearance(input: StorefrontThemeResolverInput): ResolvedStorefrontAppearance {
  const metadata = getStorefrontPresetMetadata(input.appearance)
  const preset = metadata.preset
  const palette = getStorefrontPalette(input.palette, metadata.defaultPalette)
  const shape = getStorefrontShape(input.shape, metadata.defaultShape)
  const paletteTokens = storefrontPaletteRegistry[palette]
  const shapeTokens = storefrontShapeRegistry[shape]
  const dataAppearance = metadata.dataAppearance
  const isClassicAppearance = preset === 'CLASSIC'
  const isLocalBusinessAppearance = preset === 'LOCAL_BUSINESS'
  const isPortfolioAppearance = preset === 'PORTFOLIO'
  const mode = resolveStorefrontMode(input, preset)
  const branding = normalizeStoreBranding(input.branding)
  const cssVariables = metadata.constraints.allowBrandedCssVariables
    ? ({
      '--store-brand': paletteTokens.brand,
      '--store-accent': paletteTokens.accent,
      '--store-action': paletteTokens.action,
      '--store-action-hover': paletteTokens.actionHover,
      '--store-surface-tint': paletteTokens.surfaceTint,
      '--store-border-accent': paletteTokens.borderAccent,
      '--store-action-contrast': paletteTokens.actionContrast,
      '--store-button-radius': `${shapeTokens.buttonRadius}px`,
      '--store-input-radius': `${shapeTokens.inputRadius}px`,
      '--store-card-radius': `${shapeTokens.cardRadius}px`,
      '--store-badge-radius': `${shapeTokens.badgeRadius}px`,
      '--store-primary': paletteTokens.action,
      '--store-secondary': paletteTokens.accent,
      '--store-primary-contrast': paletteTokens.actionContrast,
      '--store-secondary-contrast': paletteTokens.actionContrast
    } as CSSProperties)
    : ({} as CSSProperties)
  const isMobile = Boolean(input.isMobile)
  const productsEnabled = hasPublicStoreCapability(input.capabilities, 'PRODUCTS')
  const profileHighlights = descriptionHighlights(input.profile?.description)

  const heroStyle: CSSProperties = {
    padding: isMobile ? `${theme.spacing.lg} ${theme.spacing.md}` : `${theme.spacing.xl} ${theme.spacing.xxl}`,
    ...cssVariables,
    ...(!branding.bannerUrl && !productsEnabled ? { padding: isMobile ? `${theme.spacing.lg} 0` : `${theme.spacing.xl} 0` } : null),
    ...(isPortfolioAppearance ? { paddingBottom: isMobile ? theme.spacing.md : theme.spacing.lg } : null)
  }
  const surfaceStyle: CSSProperties = {
    padding: isMobile ? `${theme.spacing.md} 0` : `${theme.spacing.lg} 0`,
    ...(isClassicAppearance ? { padding: isMobile ? `${theme.spacing.lg} 0` : `${theme.spacing.xl} 0` } : null)
  }
  const filterPanelStyle: CSSProperties = {
    display: 'grid',
    gap: theme.spacing.md,
    padding: `${theme.spacing.md} 0`,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: paletteTokens.borderAccent,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: paletteTokens.borderAccent,
    background: 'transparent',
    ...(isClassicAppearance ? { borderTopColor: theme.colors.borderStrong, borderBottomColor: theme.colors.borderStrong } : null),
    ...(isPortfolioAppearance ? { borderTopColor: theme.colors.borderDefault, borderBottomColor: theme.colors.borderDefault } : null)
  }
  const productGridStyle: CSSProperties = {
    display: 'grid',
    gap: theme.spacing.md,
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${metadata.layout.productGridMinWidth}px), 1fr))`
  }
  const productBodyStyle: CSSProperties = {
    display: 'grid',
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  }

  return {
    preset,
    palette,
    shape,
    tokens: {
      palette: paletteTokens,
      shape: shapeTokens
    },
    dataAppearance,
    appearanceAttribute: dataAppearance,
    isClassicAppearance,
    isLocalBusinessAppearance,
    isPortfolioAppearance,
    mode,
    storefrontMode: mode,
    labels: {
      storefrontEyebrow: metadata.labels.eyebrow[mode],
      storefrontFallbackDescription: metadata.labels.fallbackDescription[mode],
      aboutTitle: metadata.labels.aboutTitle[mode],
      contactIntro: metadata.labels.contactIntro[mode],
      offerSummaryTitle: metadata.labels.offerSummaryTitle[mode],
      noCatalogFallback: metadata.labels.noCatalogFallback[mode]
    },
    layout: metadata.layout,
    sections: {
      profileHighlights,
      trustSignals: trustSignals(input, mode, profileHighlights)
    },
    styles: {
      heroStyle,
      surfaceStyle,
      filterPanelStyle,
      productGridStyle,
      productBodyStyle
    },
    cssVariables
  }
}

export function storefrontHeroOverlayStyle(): CSSProperties {
  return {
    background: `linear-gradient(90deg, ${alpha(theme.colors.textPrimary, 0.82)}, ${alpha(theme.colors.textPrimary, 0.42)} 58%, ${alpha(theme.colors.textPrimary, 0.22)})`
  }
}
