import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoreAppearancePreset, StoreCapability, StoreReadiness } from '@/api/contracts/v1/storeAdmin'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

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
}) {
  mockFetch({
    '/api/auth/me': { body: authMe },
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
    expect(document.body.textContent).not.toContain('Administrar productos')
    expect(document.body.textContent).not.toContain('Configurar envíos')

    await cleanup()
  })

  it('shows future sections as neutral and outside the score', async () => {
    mockPublishingCenter({
      readiness: simpleReadiness,
      capabilities: ['ABOUT', 'CONTACT']
    })

    const { cleanup } = await renderAppAt('/admin/store/publish')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Próximamente')
    expect(document.body.textContent).toContain('Blog')
    expect(document.body.textContent).toContain('Galería')
    expect(document.body.textContent).toContain('Reservas')
    expect(document.body.textContent).toContain('Neutral')
    expect(document.body.textContent).toContain('No cuenta para el score.')

    await cleanup()
  })
})
