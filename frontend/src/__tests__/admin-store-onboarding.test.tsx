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
  score: 60,
  publishReady: false,
  completedSteps: ['store_profile', 'contact_info', 'checkout_enabled'],
  pendingSteps: ['first_product', 'shipping_setup'],
  blockers: ['first_product', 'shipping_setup'],
  enabledCapabilities: ['ABOUT', 'CONTACT', 'PRODUCTS', 'SHIPPING', 'CHECKOUT'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Información de tu tienda', ctaLabel: 'Revisar información', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'contact_info', capability: 'CONTACT', label: 'Contacto', ctaLabel: 'Ir a miembros', ctaRoute: '/admin/members', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'first_product', capability: 'PRODUCTS', label: 'Primer producto', ctaLabel: 'Ir a Productos', ctaRoute: '/admin/store/products', required: true, blocksPublishing: true, implemented: true, completed: false },
    { id: 'shipping_setup', capability: 'SHIPPING', label: 'Configurar envíos', ctaLabel: 'Ir a Envíos', ctaRoute: '/admin/shipping/zones', required: true, blocksPublishing: true, implemented: true, completed: false },
    { id: 'checkout_enabled', capability: 'CHECKOUT', label: 'Publicar compras online', ctaLabel: 'Revisar tienda', ctaRoute: '/admin/store/modules', required: true, blocksPublishing: true, implemented: true, completed: true }
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
  it('renders readiness score, pending checklist and existing CTAs', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/readiness': { body: notReadyResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/onboarding')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Publicar tu tienda')
    expect(document.body.textContent).toContain('60% completado')
    expect(document.body.textContent).toContain('Faltan pasos')
    expect(document.body.textContent).toContain('Información de tu tienda')
    expect(document.body.textContent).toContain('Primer producto')
    expect(document.body.textContent).toContain('Configurar envíos')

    const links = Array.from(document.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    expect(links).toContain('/admin/store/products')
    expect(links).toContain('/admin/shipping/zones')
    expect(links).toContain('/admin/store')

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
