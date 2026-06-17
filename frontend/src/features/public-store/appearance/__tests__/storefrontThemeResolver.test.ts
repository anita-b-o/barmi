import { describe, expect, it } from 'vitest'
import { theme } from '@/app/theme'
import { storefrontPaletteRegistry } from '../storefrontPresetRegistry'
import { resolveStorefrontAppearance } from '../storefrontThemeResolver'

const commerceCapabilities = ['ABOUT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT', 'CONTACT'] as const
const profile = {
  description: 'Cafeteria de especialidad con desayunos y atencion de barrio. Tambien prepara brunch para eventos privados; reservas por WhatsApp.',
  email: 'hola@demo.test',
  phone: '221 555 0101',
  whatsapp: '+54 9 221 555 0101'
}
const branding = {
  logoUrl: null,
  bannerUrl: null,
  primaryColor: theme.colors.actionPrimary,
  secondaryColor: theme.colors.actionHover
}

describe('resolveStorefrontAppearance', () => {
  it('resolves ecommerce MODERN appearance', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'MODERN',
      branding,
      capabilities: [...commerceCapabilities],
      profile,
      catalog: {
        productsTotal: 2,
        categoriesCount: 2,
        promotionsCount: 1,
        hasCatalogFilters: false
      },
      contacts: {
        count: 3
      }
    })

    expect(resolved.preset).toBe('MODERN')
    expect(resolved.palette).toBe('CORAL')
    expect(resolved.shape).toBe('ROUNDED')
    expect(resolved.dataAppearance).toBe('modern')
    expect(resolved.mode).toBe('commerce')
    expect(resolved.labels.storefrontEyebrow).toBe('Tienda online')
    expect(resolved.labels.aboutTitle).toBe('Sobre la tienda')
    expect(resolved.sections.trustSignals).toEqual([
      { label: 'Catálogo', value: '2 productos publicados' },
      { label: 'Categorías', value: '2 categorías para explorar' },
      { label: 'Compra', value: 'Pedido online con validación de stock al finalizar' },
      { label: 'Entrega', value: 'Opciones de envío disponibles en checkout' },
      { label: 'Promociones', value: '1 código activo' },
      { label: 'Contacto', value: '3 canales disponibles' }
    ])
    expect(resolved.cssVariables).toMatchObject({
      '--store-primary': theme.colors.actionPrimary,
      '--store-secondary': storefrontPaletteRegistry.CORAL.accent,
      '--store-action': storefrontPaletteRegistry.CORAL.action,
      '--store-button-radius': '8px'
    })
  })

  it('resolves LOCAL_BUSINESS profile order', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'LOCAL_BUSINESS',
      capabilities: ['ABOUT', 'CONTACT'],
      profile,
      contacts: {
        count: 2
      }
    })

    expect(resolved.dataAppearance).toBe('local-business')
    expect(resolved.mode).toBe('profile')
    expect(resolved.layout.profileSectionOrder).toEqual(['contact', 'about'])
    expect(resolved.labels.storefrontEyebrow).toBe('Sitio público')
    expect(resolved.sections.trustSignals).toEqual([
      { label: 'Especialidad', value: 'Cafeteria de especialidad con desayunos y atencion de barrio' },
      { label: 'Contacto', value: '2 canales disponibles' }
    ])
  })

  it('resolves PORTFOLIO without products', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'PORTFOLIO',
      capabilities: ['ABOUT', 'CONTACT'],
      profile,
      contacts: {
        count: 1
      }
    })

    expect(resolved.mode).toBe('portfolio')
    expect(resolved.labels.storefrontEyebrow).toBe('Portfolio creativo')
    expect(resolved.labels.aboutTitle).toBe('La mirada')
    expect(resolved.labels.noCatalogFallback).toEqual({
      title: 'Proyectos y sesiones',
      description: 'El portfolio se presenta desde su historia y sus canales de contacto.'
    })
    expect(resolved.sections.trustSignals[0]).toEqual({
      label: 'Perfil',
      value: 'Cafeteria de especialidad con desayunos y atencion de barrio'
    })
  })

  it('falls back to MODERN when appearance is invalid or missing', () => {
    expect(resolveStorefrontAppearance({ appearance: 'UNKNOWN' }).preset).toBe('MODERN')
    expect(resolveStorefrontAppearance({ appearance: null }).dataAppearance).toBe('modern')
  })

  it('resolves closed palette tokens', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'MODERN',
      palette: 'OCEAN'
    })

    expect(resolved.palette).toBe('OCEAN')
    expect(resolved.tokens.palette).toMatchObject({
      brand: storefrontPaletteRegistry.OCEAN.brand,
      accent: storefrontPaletteRegistry.OCEAN.accent,
      action: storefrontPaletteRegistry.OCEAN.action,
      surfaceTint: storefrontPaletteRegistry.OCEAN.surfaceTint,
      borderAccent: storefrontPaletteRegistry.OCEAN.borderAccent
    })
    expect(resolved.cssVariables).toMatchObject({
      '--store-brand': storefrontPaletteRegistry.OCEAN.brand,
      '--store-action': storefrontPaletteRegistry.OCEAN.action,
      '--store-surface-tint': storefrontPaletteRegistry.OCEAN.surfaceTint,
      '--store-border-accent': storefrontPaletteRegistry.OCEAN.borderAccent
    })
  })

  it('resolves closed shape tokens', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'MODERN',
      shape: 'SOFT'
    })

    expect(resolved.shape).toBe('SOFT')
    expect(resolved.tokens.shape).toEqual({
      buttonRadius: 16,
      inputRadius: 14,
      cardRadius: 18,
      badgeRadius: 999
    })
    expect(resolved.cssVariables).toMatchObject({
      '--store-button-radius': '16px',
      '--store-input-radius': '14px',
      '--store-card-radius': '18px',
      '--store-badge-radius': '999px'
    })
  })

  it('falls back to CORAL and ROUNDED for missing or invalid palette and shape', () => {
    expect(resolveStorefrontAppearance({ appearance: 'LOCAL_BUSINESS' }).palette).toBe('CORAL')
    expect(resolveStorefrontAppearance({ appearance: 'LOCAL_BUSINESS' }).shape).toBe('ROUNDED')
    const resolved = resolveStorefrontAppearance({
      appearance: 'PORTFOLIO',
      palette: 'MAGENTA',
      shape: 'BUBBLE'
    })
    expect(resolved.palette).toBe('CORAL')
    expect(resolved.shape).toBe('ROUNDED')
  })

  it('handles capabilities without PRODUCTS', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'CLASSIC',
      capabilities: ['ABOUT', 'CONTACT'],
      profile,
      contacts: {
        count: 0
      }
    })

    expect(resolved.mode).toBe('services')
    expect(resolved.labels.storefrontEyebrow).toBe('Estudio profesional')
    expect(resolved.sections.trustSignals).toEqual([
      { label: 'Especialidad', value: 'Cafeteria de especialidad con desayunos y atencion de barrio' }
    ])
  })

  it('uses default branding when branding is missing', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'MODERN',
      branding: null
    })

    expect(resolved.cssVariables).toMatchObject({
      '--store-primary': theme.colors.actionPrimary,
      '--store-secondary': storefrontPaletteRegistry.CORAL.accent
    })
    expect(resolved.styles.filterPanelStyle.borderTopColor).toBe(storefrontPaletteRegistry.CORAL.borderAccent)
  })

  it('keeps the expected section order centralized', () => {
    const resolved = resolveStorefrontAppearance({
      appearance: 'MODERN',
      capabilities: [...commerceCapabilities]
    })

    expect(resolved.layout.sectionOrder).toEqual([
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
    ])
  })
})
