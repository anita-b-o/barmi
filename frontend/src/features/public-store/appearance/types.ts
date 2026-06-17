import type { CSSProperties } from 'react'
import type {
  PublicStoreAppearancePreset,
  PublicStoreBranding,
  PublicStoreCapability,
  PublicStoreProfile
} from '@/api/contracts/v1/public'

export type StorefrontMode = 'commerce' | 'services' | 'portfolio' | 'profile'
export type StorefrontPalette = 'CORAL' | 'OCEAN' | 'FOREST' | 'GRAPHITE'
export type StorefrontShape = 'SQUARE' | 'ROUNDED' | 'SOFT'

export type StorefrontSectionId =
  | 'hero'
  | 'cart-warning'
  | 'loading'
  | 'error'
  | 'trust'
  | 'non-commerce-lead'
  | 'about'
  | 'contact'
  | 'empty-profile'
  | 'catalog'
  | 'promotions'
  | 'cart'

export type StorefrontPresetMetadata = {
  preset: PublicStoreAppearancePreset
  defaultPalette: StorefrontPalette
  defaultShape: StorefrontShape
  dataAppearance: string
  defaultMode: StorefrontMode
  labels: {
    eyebrow: Record<StorefrontMode, string>
    fallbackDescription: Record<StorefrontMode, string>
    aboutTitle: Record<StorefrontMode, string>
    contactIntro: Record<StorefrontMode, string>
    offerSummaryTitle: Record<StorefrontMode, string>
    noCatalogFallback: Record<StorefrontMode, { title: string; description: string }>
  }
  layout: {
    profileSectionOrder: Array<'about' | 'contact'>
    sectionOrder: StorefrontSectionId[]
    hero: 'standard' | 'compact'
    productGridMinWidth: number
  }
  constraints: {
    allowBannerImage: boolean
    allowBrandedCssVariables: boolean
  }
}

export type StorefrontThemeResolverInput = {
  appearance?: PublicStoreAppearancePreset | string | null
  palette?: StorefrontPalette | string | null
  shape?: StorefrontShape | string | null
  branding?: Partial<PublicStoreBranding> | null
  capabilities?: PublicStoreCapability[] | null
  profile?: Partial<PublicStoreProfile> | null
  isMobile?: boolean
  catalog?: {
    productsTotal?: number | null
    categoriesCount?: number | null
    promotionsCount?: number | null
    hasCatalogFilters?: boolean
  }
  cart?: {
    itemsCount?: number | null
  }
  contacts?: {
    count?: number | null
  }
}

export type StorefrontTrustSignal = {
  label: string
  value: string
}

export type ResolvedStorefrontAppearance = {
  preset: PublicStoreAppearancePreset
  palette: StorefrontPalette
  shape: StorefrontShape
  tokens: {
    palette: {
      brand: string
      accent: string
      action: string
      actionHover: string
      surfaceTint: string
      borderAccent: string
      actionContrast: string
    }
    shape: {
      buttonRadius: number
      inputRadius: number
      cardRadius: number
      badgeRadius: number
    }
  }
  dataAppearance: string
  appearanceAttribute: string
  isClassicAppearance: boolean
  isLocalBusinessAppearance: boolean
  isPortfolioAppearance: boolean
  mode: StorefrontMode
  storefrontMode: StorefrontMode
  labels: {
    storefrontEyebrow: string
    storefrontFallbackDescription: string
    aboutTitle: string
    contactIntro: string
    offerSummaryTitle: string
    noCatalogFallback: { title: string; description: string }
  }
  layout: {
    profileSectionOrder: Array<'about' | 'contact'>
    sectionOrder: StorefrontSectionId[]
    hero: 'standard' | 'compact'
    productGridMinWidth: number
  }
  sections: {
    profileHighlights: string[]
    trustSignals: StorefrontTrustSignal[]
  }
  styles: {
    heroStyle: CSSProperties
    surfaceStyle: CSSProperties
    filterPanelStyle: CSSProperties
    productGridStyle: CSSProperties
    productBodyStyle: CSSProperties
  }
  cssVariables: CSSProperties
}
