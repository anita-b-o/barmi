import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [{ storeId: 'store-1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
    ecosystems: []
  }
}

const notReadyResponse = {
  score: 50,
  publishReady: false,
  completedSteps: ['store_profile', 'store_preview'],
  pendingSteps: ['first_product', 'shipping_setup'],
  blockers: ['first_product', 'shipping_setup'],
  enabledCapabilities: ['ABOUT', 'CONTACT', 'PRODUCTS', 'SHIPPING', 'CHECKOUT'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Perfil de tu tienda', ctaLabel: 'Revisar perfil', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'first_product', capability: 'PRODUCTS', label: 'Primer producto', ctaLabel: 'Crear producto', ctaRoute: '/admin/store/products', required: true, blocksPublishing: true, implemented: true, completed: false },
    { id: 'shipping_setup', capability: 'SHIPPING', label: 'Envíos', ctaLabel: 'Configurar envíos', ctaRoute: '/admin/shipping/zones', required: true, blocksPublishing: true, implemented: true, completed: false },
    { id: 'checkout_enabled', capability: 'CHECKOUT', label: 'Compras online', ctaLabel: 'Elegir tipo de sitio', ctaRoute: '/admin/store/modules', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'store_preview', capability: 'ABOUT', label: 'Vista previa de tu tienda', ctaLabel: 'Ver tienda', ctaRoute: '/public/demo-store', required: false, blocksPublishing: false, implemented: true, completed: true }
  ]
}

const simpleResponse = {
  score: 50,
  publishReady: false,
  completedSteps: ['store_profile', 'site_preview'],
  pendingSteps: ['contact_info'],
  blockers: ['contact_info'],
  enabledCapabilities: ['ABOUT', 'CONTACT'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Perfil de tu sitio', ctaLabel: 'Revisar perfil', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'contact_info', capability: 'CONTACT', label: 'Contacto', ctaLabel: 'Gestionar contacto', ctaRoute: '/admin/members', required: true, blocksPublishing: true, implemented: true, completed: false },
    { id: 'site_preview', capability: 'ABOUT', label: 'Vista previa de tu sitio', ctaLabel: 'Ver sitio', ctaRoute: '/public/demo-store', required: false, blocksPublishing: false, implemented: true, completed: true }
  ]
}

const futureResponse = {
  ...simpleResponse,
  score: 100,
  publishReady: true,
  completedSteps: ['store_profile', 'contact_info', 'site_preview'],
  pendingSteps: ['blog_coming_soon', 'gallery_coming_soon', 'reservations_coming_soon'],
  blockers: [],
  enabledCapabilities: ['ABOUT', 'CONTACT', 'BLOG', 'GALLERY', 'RESERVATIONS'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Perfil de tu sitio', ctaLabel: 'Revisar perfil', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'contact_info', capability: 'CONTACT', label: 'Contacto', ctaLabel: 'Gestionar contacto', ctaRoute: '/admin/members', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'gallery_coming_soon', capability: 'GALLERY', label: 'Galería próximamente', ctaLabel: 'Próximamente', ctaRoute: null, required: false, blocksPublishing: false, implemented: false, completed: false },
    { id: 'blog_coming_soon', capability: 'BLOG', label: 'Blog próximamente', ctaLabel: 'Próximamente', ctaRoute: null, required: false, blocksPublishing: false, implemented: false, completed: false },
    { id: 'reservations_coming_soon', capability: 'RESERVATIONS', label: 'Reservas próximamente', ctaLabel: 'Próximamente', ctaRoute: null, required: false, blocksPublishing: false, implemented: false, completed: false },
    { id: 'site_preview', capability: 'ABOUT', label: 'Vista previa de tu sitio', ctaLabel: 'Ver sitio', ctaRoute: '/public/demo-store', required: false, blocksPublishing: false, implemented: true, completed: true }
  ]
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store onboarding', () => {
  it('renders ecommerce readiness with products and shipping steps', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/readiness': { body: notReadyResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/onboarding')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Prepará tu tienda online')
    expect(document.body.textContent).toContain('50% completado')
    expect(document.body.textContent).toContain('Faltan pasos')
    expect(document.body.textContent).toContain('Perfil de tu tienda')
    expect(document.body.textContent).toContain('Primer producto')
    expect(document.body.textContent).toContain('Envíos')
    expect(document.body.textContent).toContain('Elegir tipo de sitio')

    const links = Array.from(document.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    expect(links).toContain('/admin/store/products')
    expect(links).toContain('/admin/shipping/zones')
    expect(links).toContain('/admin/store')
    expect(links).toContain('/admin/store/modules')

    await cleanup()
  })

  it('renders simple readiness without products or shipping', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/readiness': { body: simpleResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/onboarding')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Prepará tu sitio')
    expect(document.body.textContent).toContain('Contacto')
    expect(document.body.textContent).not.toContain('Crear producto')
    expect(document.body.textContent).not.toContain('Configurar envíos')

    await cleanup()
  })

  it('shows future site parts as upcoming and non-error states', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/readiness': { body: futureResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/onboarding')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Galería próximamente')
    expect(document.body.textContent).toContain('Blog próximamente')
    expect(document.body.textContent).toContain('Reservas próximamente')
    expect(document.body.textContent).toContain('Próximamente')
    expect(document.body.textContent).toContain('Lista para publicar')
    expect(document.body.textContent).not.toContain('Faltan pasos')

    await cleanup()
  })

  it('shows the ready state when publishing requirements are complete', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/readiness': {
        body: {
          ...notReadyResponse,
          score: 100,
          publishReady: true,
          pendingSteps: [],
          blockers: [],
          steps: notReadyResponse.steps.map((step) => ({ ...step, completed: true }))
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/onboarding')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('100% completado')
    expect(document.body.textContent).toContain('Lista para publicar')
    expect(document.body.textContent).not.toContain('Necesario')

    await cleanup()
  })
})
