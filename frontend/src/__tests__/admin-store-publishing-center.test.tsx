import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoreAppearancePreset, StoreCapability, StoreReadiness } from '@/api/contracts/v1/storeAdmin'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [{ storeId: 'store-1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
    ecosystems: []
  }
}

const ecommerceReadiness: StoreReadiness = {
  score: 50,
  publishReady: false,
  completedSteps: ['store_profile', 'store_preview'],
  pendingSteps: ['first_product', 'shipping_setup'],
  blockers: ['first_product', 'shipping_setup'],
  enabledCapabilities: ['ABOUT', 'CONTACT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Perfil de tu tienda', ctaLabel: 'Revisar perfil', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'contact_info', capability: 'CONTACT', label: 'Contacto', ctaLabel: 'Gestionar contacto', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'first_product', capability: 'PRODUCTS', label: 'Primer producto', ctaLabel: 'Crear producto', ctaRoute: '/admin/store/products', required: true, blocksPublishing: true, implemented: true, completed: false },
    { id: 'shipping_setup', capability: 'SHIPPING', label: 'Envíos', ctaLabel: 'Configurar envíos', ctaRoute: '/admin/shipping/zones', required: true, blocksPublishing: true, implemented: true, completed: false },
    { id: 'checkout_enabled', capability: 'CHECKOUT', label: 'Compras online', ctaLabel: 'Elegir tipo de sitio', ctaRoute: '/admin/store/modules', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'promo_optional', capability: 'PROMOTIONS', label: 'Promociones', ctaLabel: 'Gestionar promociones', ctaRoute: '/admin/store/promotions', required: false, blocksPublishing: false, implemented: true, completed: false },
    { id: 'store_preview', capability: 'ABOUT', label: 'Vista previa de tu tienda', ctaLabel: 'Ver tienda', ctaRoute: '/public/demo-store', required: false, blocksPublishing: false, implemented: true, completed: true }
  ]
}

const simpleReadiness: StoreReadiness = {
  score: 100,
  publishReady: true,
  completedSteps: ['store_profile', 'contact_info', 'site_preview'],
  pendingSteps: ['blog_coming_soon', 'gallery_coming_soon', 'reservations_coming_soon'],
  blockers: [],
  enabledCapabilities: ['ABOUT', 'CONTACT'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Perfil de tu sitio', ctaLabel: 'Revisar perfil', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'contact_info', capability: 'CONTACT', label: 'Contacto', ctaLabel: 'Gestionar contacto', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'gallery_coming_soon', capability: 'GALLERY', label: 'Galería próximamente', ctaLabel: 'Próximamente', ctaRoute: null, required: false, blocksPublishing: false, implemented: false, completed: false },
    { id: 'blog_coming_soon', capability: 'BLOG', label: 'Blog próximamente', ctaLabel: 'Próximamente', ctaRoute: null, required: false, blocksPublishing: false, implemented: false, completed: false },
    { id: 'reservations_coming_soon', capability: 'RESERVATIONS', label: 'Reservas próximamente', ctaLabel: 'Próximamente', ctaRoute: null, required: false, blocksPublishing: false, implemented: false, completed: false },
    { id: 'site_preview', capability: 'ABOUT', label: 'Vista previa de tu sitio', ctaLabel: 'Ver sitio', ctaRoute: '/public/demo-store', required: false, blocksPublishing: false, implemented: true, completed: true }
  ]
}

const presets = {
  presets: [
    {
      key: 'ONLINE_STORE',
      name: 'Tienda online',
      description: 'Sitio con catálogo, promociones, envíos y checkout.',
      capabilities: ['ABOUT', 'CONTACT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT']
    },
    {
      key: 'SIMPLE_PAGE',
      name: 'Sitio simple',
      description: 'Presencia básica con información pública y contacto.',
      capabilities: ['ABOUT', 'CONTACT']
    }
  ]
}

const profile = {
  publicDescription: 'Cafetería de especialidad.',
  publicEmail: 'hola@demo.test',
  publicPhone: null,
  publicWhatsapp: null
}

function mockPublishingCenter(payload: {
  readiness: StoreReadiness
  capabilities: StoreCapability[]
  appearance?: StoreAppearancePreset
  auth?: typeof authMe
}) {
  mockFetch({
    '/api/auth/me': { body: payload.auth ?? authMe },
    '/api/store/readiness': { body: payload.readiness },
    '/api/store/capabilities': {
      body: {
        enabled: payload.capabilities,
        available: [
          { key: 'ABOUT', label: 'Sobre tu negocio', description: 'Información institucional.' },
          { key: 'CONTACT', label: 'Contacto', description: 'Canales públicos.' },
          { key: 'PRODUCTS', label: 'Productos', description: 'Catálogo público.' },
          { key: 'PROMOTIONS', label: 'Promociones', description: 'Cupones y beneficios.' },
          { key: 'SHIPPING', label: 'Envíos', description: 'Cobertura y costos.' },
          { key: 'CHECKOUT', label: 'Checkout', description: 'Compra online.' },
          { key: 'BLOG', label: 'Blog', description: 'Contenido futuro.' },
          { key: 'GALLERY', label: 'Galería', description: 'Contenido visual futuro.' },
          { key: 'RESERVATIONS', label: 'Reservas', description: 'Turnos futuros.' }
        ]
      }
    },
    '/api/store/capability-presets': { body: presets },
    '/api/store/appearance': { body: { preset: payload.appearance ?? 'LOCAL_BUSINESS' } },
    '/api/store/profile': { body: profile }
  })
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store publishing center', () => {
  it('renders the publishing center summary with score and publishReady state', async () => {
    mockPublishingCenter({
      readiness: ecommerceReadiness,
      capabilities: ['ABOUT', 'CONTACT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT']
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Prepará tu sitio')
    expect(document.body.textContent).toContain('Completá estos pasos para publicar tu presencia digital.')
    expect(document.body.textContent).toContain('50% completado')
    expect(document.body.textContent).toContain('Faltan pasos')
    expect(document.body.textContent).toContain('Tu sitio público')
    expect(document.body.textContent).toContain(`${window.location.origin}/public/demo-store`)
    expect(document.body.textContent).toContain('Faltan pasos para publicar')
    expect(document.body.textContent).toContain('Tienda pública')
    expect(document.body.textContent).toContain('Ver vista previa')

    await cleanup()
  })

  it('renders ecommerce sections with product, shipping and optional promotion CTAs', async () => {
    mockPublishingCenter({
      readiness: ecommerceReadiness,
      capabilities: ['ABOUT', 'CONTACT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT']
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Tienda online')
    expect(document.body.textContent).toContain('Negocio local')
    expect(document.body.textContent).toContain('Información pública')
    expect(document.body.textContent).toContain('Completado')
    expect(document.body.textContent).toContain('Productos')
    expect(document.body.textContent).toContain('Envíos')
    expect(document.body.textContent).toContain('Promociones')
    expect(document.body.textContent).toContain('No bloqueante')

    const links = Array.from(document.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    expect(links).toContain('/admin/store/modules')
    expect(links).toContain('/admin/store/appearance')
    expect(links).toContain('/admin/store/profile')
    expect(links).toContain('/admin/store/products')
    expect(links).toContain('/admin/shipping/zones')
    expect(links).toContain('/admin/store/promotions')
    expect(links).toContain('/public/demo-store')

    await cleanup()
  })

  it('renders a simple site without ecommerce-only sections', async () => {
    mockPublishingCenter({
      readiness: simpleReadiness,
      capabilities: ['ABOUT', 'CONTACT'],
      appearance: 'PORTFOLIO'
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Sitio simple')
    expect(document.body.textContent).toContain('Portfolio')
    expect(document.body.textContent).toContain('100% completado')
    expect(document.body.textContent).toContain('Lista para publicar')
    expect(document.body.textContent).toContain('Publicado')
    expect(document.body.textContent).toContain('Abrir sitio público')
    expect(document.body.textContent).not.toContain('Administrar productos')
    expect(document.body.textContent).not.toContain('Configurar envíos')

    await cleanup()
  })

  it('keeps future sections out of the publishing steps', async () => {
    mockPublishingCenter({
      readiness: simpleReadiness,
      capabilities: ['ABOUT', 'CONTACT']
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Más adelante')
    expect(document.body.textContent).toContain('Blog, galería y reservas están pensados para una etapa posterior.')
    expect(document.body.textContent).not.toContain('Neutral')
    expect(document.body.textContent).not.toContain('No cuenta para el score.')

    await cleanup()
  })

  it('renders public site capabilities as visual status only', async () => {
    mockPublishingCenter({
      readiness: ecommerceReadiness,
      capabilities: ['ABOUT', 'CONTACT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT']
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Secciones visibles')
    expect(document.body.textContent).toContain('Sobre nosotros')
    expect(document.body.textContent).toContain('Contacto')
    expect(document.body.textContent).toContain('Productos')
    expect(document.body.textContent).toContain('Promociones')
    expect(document.body.textContent).toContain('Compras online')
    expect(document.querySelectorAll('button')).not.toHaveLength(0)
    expect(document.body.textContent).not.toContain('Editar secciones visibles')

    await cleanup()
  })

  it('opens the public site in a new tab from the dashboard', async () => {
    mockPublishingCenter({
      readiness: simpleReadiness,
      capabilities: ['ABOUT', 'CONTACT']
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    const publicSiteLink = Array.from(document.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Abrir sitio público'))

    expect(publicSiteLink?.getAttribute('href')).toBe(`${window.location.origin}/public/demo-store`)
    expect(publicSiteLink?.getAttribute('target')).toBe('_blank')
    expect(publicSiteLink?.getAttribute('rel')).toBe('noreferrer')

    await cleanup()
  })

  it('copies the public site link with accessible feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })
    mockPublishingCenter({
      readiness: simpleReadiness,
      capabilities: ['ABOUT', 'CONTACT']
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    const copyButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent === 'Copiar enlace')
    await clickElement(copyButton)
    await flush()

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/public/demo-store`)
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Enlace copiado')

    await cleanup()
  })

  it('renders a reasonable fallback when the active store has no slug', async () => {
    mockPublishingCenter({
      readiness: simpleReadiness,
      capabilities: ['ABOUT', 'CONTACT'],
      auth: {
        ...authMe,
        memberships: {
          stores: [{ storeId: 'store-1', storeSlug: '', role: 'OWNER', status: 'ACTIVE' }],
          ecosystems: []
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Todavía no hay un slug público disponible para esta store.')
    expect(document.body.textContent).not.toContain(`${window.location.origin}/public/demo-store`)
    const copyButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent === 'Copiar enlace')
    expect(copyButton?.disabled).toBe(true)

    await cleanup()
  })
})
