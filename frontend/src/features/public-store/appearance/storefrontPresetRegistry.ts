import type { PublicStoreAppearancePreset } from '@/api/contracts/v1/public'
import { tokens } from '@/app/theme/tokens'
import type { StorefrontMode, StorefrontPalette, StorefrontPresetMetadata, StorefrontSectionId, StorefrontShape } from './types'

export const STOREFRONT_APPEARANCE_PRESETS: PublicStoreAppearancePreset[] = [
  'MODERN',
  'CLASSIC',
  'LOCAL_BUSINESS',
  'PORTFOLIO'
]

export const STOREFRONT_PALETTES: StorefrontPalette[] = [
  'CORAL',
  'OCEAN',
  'FOREST',
  'GRAPHITE'
]

export const STOREFRONT_SHAPES: StorefrontShape[] = [
  'SQUARE',
  'ROUNDED',
  'SOFT'
]

export const storefrontPaletteRegistry: Record<StorefrontPalette, {
  brand: string
  accent: string
  action: string
  actionHover: string
  surfaceTint: string
  borderAccent: string
  actionContrast: string
}> = {
  CORAL: {
    brand: tokens.rawColors.primary500,
    accent: tokens.rawColors.primary600,
    action: tokens.rawColors.primary500,
    actionHover: tokens.rawColors.primary600,
    surfaceTint: tokens.rawColors.coralSurfaceTint,
    borderAccent: tokens.rawColors.coralBorderAccent,
    actionContrast: tokens.rawColors.white
  },
  OCEAN: {
    brand: tokens.rawColors.oceanBrand,
    accent: tokens.rawColors.oceanAccent,
    action: tokens.rawColors.oceanBrand,
    actionHover: tokens.rawColors.oceanActionHover,
    surfaceTint: tokens.rawColors.oceanSurfaceTint,
    borderAccent: tokens.rawColors.oceanBorderAccent,
    actionContrast: tokens.rawColors.white
  },
  FOREST: {
    brand: tokens.rawColors.forestBrand,
    accent: tokens.rawColors.forestAccent,
    action: tokens.rawColors.forestAction,
    actionHover: tokens.rawColors.forestActionHover,
    surfaceTint: tokens.rawColors.forestSurfaceTint,
    borderAccent: tokens.rawColors.forestBorderAccent,
    actionContrast: tokens.rawColors.white
  },
  GRAPHITE: {
    brand: tokens.rawColors.graphiteBrand,
    accent: tokens.rawColors.graphiteAccent,
    action: tokens.rawColors.graphiteAction,
    actionHover: tokens.rawColors.graphiteAccent,
    surfaceTint: tokens.rawColors.graphiteSurfaceTint,
    borderAccent: tokens.rawColors.graphiteBorderAccent,
    actionContrast: tokens.rawColors.white
  }
}

export const storefrontShapeRegistry: Record<StorefrontShape, {
  buttonRadius: number
  inputRadius: number
  cardRadius: number
  badgeRadius: number
}> = {
  SQUARE: {
    buttonRadius: 2,
    inputRadius: 2,
    cardRadius: 4,
    badgeRadius: 2
  },
  ROUNDED: {
    buttonRadius: 8,
    inputRadius: 8,
    cardRadius: 8,
    badgeRadius: 999
  },
  SOFT: {
    buttonRadius: 16,
    inputRadius: 14,
    cardRadius: 18,
    badgeRadius: 999
  }
}

const eyebrow: StorefrontPresetMetadata['labels']['eyebrow'] = {
  commerce: 'Tienda online',
  services: 'Estudio profesional',
  portfolio: 'Portfolio creativo',
  profile: 'Sitio público'
}

const fallbackDescription: StorefrontPresetMetadata['labels']['fallbackDescription'] = {
  commerce: 'Productos seleccionados, disponibilidad y contacto directo.',
  services: 'Información del estudio y canales de consulta profesional.',
  portfolio: 'Trabajos, mirada y contacto para nuevos proyectos.',
  profile: 'Información principal y canales de contacto.'
}

const aboutTitle: StorefrontPresetMetadata['labels']['aboutTitle'] = {
  commerce: 'Sobre la tienda',
  services: 'El estudio',
  portfolio: 'La mirada',
  profile: 'Sobre nosotros'
}

const contactIntro: StorefrontPresetMetadata['labels']['contactIntro'] = {
  commerce: 'Canales disponibles para consultar antes de comprar.',
  services: 'Canales directos para coordinar una consulta profesional.',
  portfolio: 'Canales directos para conversar sobre una sesión o proyecto.',
  profile: 'Canales directos del negocio.'
}

const offerSummaryTitle: StorefrontPresetMetadata['labels']['offerSummaryTitle'] = {
  commerce: 'Qué encontrás acá',
  services: 'Servicios y consultas',
  portfolio: 'Enfoque del portfolio',
  profile: 'Información disponible'
}

const noCatalogFallback: StorefrontPresetMetadata['labels']['noCatalogFallback'] = {
  commerce: {
    title: 'Pronto habrá novedades aquí',
    description: 'La tienda está preparando lo próximo. Mientras tanto, podés usar sus canales de contacto.'
  },
  services: {
    title: 'Consultas profesionales',
    description: 'El primer paso es una conversación. Elegí el canal que te resulte más cómodo.'
  },
  portfolio: {
    title: 'Proyectos y sesiones',
    description: 'El portfolio se presenta desde su historia y sus canales de contacto.'
  },
  profile: {
    title: 'Pronto habrá novedades aquí',
    description: 'La tienda está preparando lo próximo. Mientras tanto, podés usar sus canales de contacto.'
  }
}

const labels = {
  eyebrow,
  fallbackDescription,
  aboutTitle,
  contactIntro,
  offerSummaryTitle,
  noCatalogFallback
}

const defaultSectionOrder: StorefrontSectionId[] = [
  'hero',
  'cart-warning',
  'loading',
  'error',
  'trust',
  'non-commerce-lead',
  'about',
  'contact',
  'empty-profile',
  'catalog',
  'promotions',
  'cart'
]

function dataAppearance(preset: PublicStoreAppearancePreset) {
  return preset.toLowerCase().replace('_', '-')
}

function presetMetadata(
  preset: PublicStoreAppearancePreset,
  defaultMode: StorefrontMode,
  defaultPalette: StorefrontPalette,
  defaultShape: StorefrontShape,
  profileSectionOrder: Array<'about' | 'contact'>
): StorefrontPresetMetadata {
  return {
    preset,
    defaultPalette,
    defaultShape,
    dataAppearance: dataAppearance(preset),
    defaultMode,
    labels,
    layout: {
      profileSectionOrder,
      sectionOrder: defaultSectionOrder,
      hero: 'standard',
      productGridMinWidth: 220
    },
    constraints: {
      allowBannerImage: true,
      allowBrandedCssVariables: true
    }
  }
}

export const storefrontPresetRegistry: Record<PublicStoreAppearancePreset, StorefrontPresetMetadata> = {
  MODERN: presetMetadata('MODERN', 'commerce', 'CORAL', 'ROUNDED', ['about', 'contact']),
  CLASSIC: presetMetadata('CLASSIC', 'services', 'CORAL', 'ROUNDED', ['about', 'contact']),
  LOCAL_BUSINESS: presetMetadata('LOCAL_BUSINESS', 'profile', 'CORAL', 'ROUNDED', ['contact', 'about']),
  PORTFOLIO: presetMetadata('PORTFOLIO', 'portfolio', 'CORAL', 'ROUNDED', ['about', 'contact'])
}

export function getStorefrontPresetMetadata(appearance?: PublicStoreAppearancePreset | string | null) {
  const normalized = typeof appearance === 'string'
    ? appearance.trim().toUpperCase()
    : ''
  return storefrontPresetRegistry[normalized as PublicStoreAppearancePreset] ?? storefrontPresetRegistry.MODERN
}

export function getStorefrontPalette(value?: StorefrontPalette | string | null, fallback: StorefrontPalette = 'CORAL') {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase()
    : ''
  return STOREFRONT_PALETTES.includes(normalized as StorefrontPalette)
    ? normalized as StorefrontPalette
    : fallback
}

export function getStorefrontShape(value?: StorefrontShape | string | null, fallback: StorefrontShape = 'ROUNDED') {
  const normalized = typeof value === 'string'
    ? value.trim().toUpperCase()
    : ''
  return STOREFRONT_SHAPES.includes(normalized as StorefrontShape)
    ? normalized as StorefrontShape
    : fallback
}
