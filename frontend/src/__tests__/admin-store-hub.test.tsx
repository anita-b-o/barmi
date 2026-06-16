import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setInputElementValue, setSelectElementValue, setTextAreaElementValue } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 'store-1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' },
      { storeId: 'store-2', storeSlug: 'legacy-store', role: 'ADMIN', status: 'INACTIVE' }
    ],
    ecosystems: []
  }
}

const discoverySettings = {
  storeId: 'store-1',
  storeSlug: 'demo-store',
  storeName: 'Demo Store',
  actorRole: 'OWNER',
  ecosystem: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' },
  publicCategoryKey: 'cafeteria',
  publicLocationLabel: 'Palermo, CABA',
  publicLatitude: -34.58751,
  publicLongitude: -58.43072,
  ecosystems: [
    { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' },
    { id: 'eco-2', slug: 'buenos-aires-norte', name: 'Buenos Aires Norte' }
  ],
  categories: [
    { key: 'cafeteria', label: 'Cafeteria' },
    { key: 'panaderia', label: 'Panaderia' }
  ]
}

const publicProfile = {
  publicDescription: 'Cafetería de especialidad con atención de barrio.',
  publicEmail: 'hola@demo.test',
  publicPhone: '221 555 0101',
  publicWhatsapp: '+54 9 221 555 0101'
}

const readinessResponse = {
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

const simpleReadinessResponse = {
  score: 50,
  publishReady: false,
  completedSteps: ['store_profile', 'site_preview'],
  pendingSteps: ['contact_info'],
  blockers: ['contact_info'],
  enabledCapabilities: ['ABOUT', 'CONTACT'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Perfil de tu sitio', ctaLabel: 'Revisar perfil', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'contact_info', capability: 'CONTACT', label: 'Contacto', ctaLabel: 'Gestionar contacto', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: false },
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

describe('admin store hub', () => {
  it('uses /admin/store as an operational hub without duplicating shipping management', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 1,
          ordersByStatus: { PENDING_PAYMENT: 0, PAID: 1, CANCELLED: 0 },
          confirmedSalesTotalAmount: 100,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 1, CANCELLED: 0 },
          activeProducts: 1,
          inactiveProducts: 0
        }
      },
      '/api/store/analytics/report?range=7d': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 1,
            paymentsConfirmed: 1,
            manualCancellations: 0,
            stockConflicts: 0,
            fulfillmentsCreated: 1,
            confirmedSalesTotalAmount: 100,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 1, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': {
        body: discoverySettings
      },
      '/api/store/profile': {
        body: publicProfile
      },
      '/api/store/readiness': {
        body: readinessResponse
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Hub operativo')
    expect(document.body.textContent).toContain('demo-store')
    expect(document.body.textContent).not.toContain('legacy-store')
    expect(document.body.textContent).toContain('Abrir órdenes')
    expect(document.body.textContent).toContain('Abrir fulfillments')
    expect(document.body.textContent).toContain('Gestionar miembros')
    expect(document.body.textContent).toContain('Gestionar productos')
    expect(document.body.textContent).toContain('Gestionar promociones')
    expect(document.body.textContent).toContain('Gestionar zonas')
    expect(document.body.textContent).toContain('Analytics MVP')
    expect(document.body.textContent).toContain('Reporting operativo MVP')
    expect(document.body.textContent).toContain('Discovery público')
    expect(document.body.textContent).toContain('Información pública')
    expect(document.body.textContent).toContain('Cafetería de especialidad con atención de barrio.')
    expect(document.body.textContent).toContain('Prepará tu tienda online')
    expect(document.body.textContent).toContain('50% completado')
    expect(document.body.textContent).toContain('Primer producto')
    expect(document.body.textContent).toContain('Elegir tipo de sitio')
    expect(document.body.textContent).toContain('Publicar sitio')
    expect(document.body.textContent).toContain('OWNER puede editar')
    expect(document.body.textContent).toContain('Palermo, CABA')
    expect(document.body.textContent).not.toContain('Crear zona')
    expect(document.body.textContent).not.toContain('Eliminar zona')

    const links = Array.from(document.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    expect(links).toContain('/admin/orders')
    expect(links).toContain('/admin/fulfillments')
    expect(links).toContain('/admin/members')
    expect(links).toContain('/admin/store/products')
    expect(links).toContain('/admin/store/promotions')
    expect(links).toContain('/admin/shipping/zones')
    expect(links).toContain('/admin/store/modules')
    expect(links).toContain('/admin/store/publish')

    await cleanup()
  })

  it('reflects simple site readiness in the hub card', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 0,
          ordersByStatus: { PENDING_PAYMENT: 0, PAID: 0, CANCELLED: 0 },
          confirmedSalesTotalAmount: 0,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 },
          activeProducts: 0,
          inactiveProducts: 0
        }
      },
      '/api/store/analytics/report?range=7d': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 0,
            paymentsConfirmed: 0,
            manualCancellations: 0,
            stockConflicts: 0,
            fulfillmentsCreated: 0,
            confirmedSalesTotalAmount: 0,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': {
        body: discoverySettings
      },
      '/api/store/profile': {
        body: publicProfile
      },
      '/api/store/readiness': {
        body: simpleReadinessResponse
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Prepará tu sitio')
    expect(document.body.textContent).toContain('50% completado')
    expect(document.body.textContent).toContain('Contacto')
    expect(document.body.textContent).not.toContain('Crear producto')
    expect(document.body.textContent).not.toContain('Configurar envíos')

    await cleanup()
  })

  it('renders and saves public information', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 0,
          ordersByStatus: { PENDING_PAYMENT: 0, PAID: 0, CANCELLED: 0 },
          confirmedSalesTotalAmount: 0,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 },
          activeProducts: 0,
          inactiveProducts: 0
        }
      },
      '/api/store/analytics/report?range=7d': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 0,
            paymentsConfirmed: 0,
            manualCancellations: 0,
            stockConflicts: 0,
            fulfillmentsCreated: 0,
            confirmedSalesTotalAmount: 0,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': { body: discoverySettings },
      '/api/store/readiness': { body: simpleReadinessResponse },
      '/api/store/profile': (url, init) => {
        if (init?.method === 'PUT') {
          return {
            body: {
              publicDescription: 'Salón de cortes y color.',
              publicEmail: 'turnos@demo.test',
              publicPhone: '221 555 9999',
              publicWhatsapp: '+54 9 221 555 9999'
            }
          }
        }
        return { body: publicProfile }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    const description = document.querySelector('textarea[aria-label="Descripción de tu negocio"]') as HTMLTextAreaElement
    const email = document.querySelector('input[aria-label="Email público"]') as HTMLInputElement
    const phone = document.querySelector('input[aria-label="Teléfono público"]') as HTMLInputElement
    const whatsapp = document.querySelector('input[aria-label="WhatsApp"]') as HTMLInputElement
    expect(description.value).toBe(publicProfile.publicDescription)

    await setTextAreaElementValue(description, 'Salón de cortes y color.')
    await setInputElementValue(email, 'turnos@demo.test')
    await setInputElementValue(phone, '221 555 9999')
    await setInputElementValue(whatsapp, '+54 9 221 555 9999')
    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar información pública')))
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url).includes('/api/store/profile') && init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toMatchObject({
      publicDescription: 'Salón de cortes y color.',
      publicEmail: 'turnos@demo.test',
      publicPhone: '221 555 9999',
      publicWhatsapp: '+54 9 221 555 9999'
    })
    expect(document.body.textContent).toContain('Información pública guardada.')

    await cleanup()
  })

  it('updates public discovery fields from the store hub', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 1,
          ordersByStatus: { PENDING_PAYMENT: 0, PAID: 1, CANCELLED: 0 },
          confirmedSalesTotalAmount: 100,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 1, CANCELLED: 0 },
          activeProducts: 1,
          inactiveProducts: 0
        }
      },
      '/api/store/analytics/report?range=7d': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 1,
            paymentsConfirmed: 1,
            manualCancellations: 0,
            stockConflicts: 0,
            fulfillmentsCreated: 1,
            confirmedSalesTotalAmount: 100,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 1, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': (url, init) => {
        if (init?.method === 'PUT') {
          return {
            body: {
              ...discoverySettings,
              ecosystem: { id: 'eco-2', slug: 'buenos-aires-norte', name: 'Buenos Aires Norte' },
              publicCategoryKey: 'panaderia',
              publicLocationLabel: 'Belgrano, CABA',
              publicLatitude: -34.5621,
              publicLongitude: -58.4567
            }
          }
        }
        return { body: discoverySettings }
      },
      '/api/store/profile': {
        body: publicProfile
      },
      '/api/store/readiness': {
        body: readinessResponse
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    await setSelectElementValue(document.querySelector('select[aria-label="Ecosystem asociado"]') as HTMLSelectElement, 'eco-2')
    await setSelectElementValue(document.querySelector('select[aria-label="Categoría pública principal"]') as HTMLSelectElement, 'panaderia')
    await setInputElementValue(document.querySelector('input[aria-label="Label de ubicación pública"]') as HTMLInputElement, 'Belgrano, CABA')
    await setInputElementValue(document.querySelector('input[aria-label="Latitud pública"]') as HTMLInputElement, '-34.5621')
    await setInputElementValue(document.querySelector('input[aria-label="Longitud pública"]') as HTMLInputElement, '-58.4567')

    await clickElement(Array.from(document.querySelectorAll('button[type="submit"]')).find((button) => button.textContent?.includes('Guardar discovery público')))
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/store/admin/discovery' && init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(putCall?.[0]).toBe('/api/store/admin/discovery')
    expect(putCall?.[1]?.body).toBe(JSON.stringify({
      ecosystemId: 'eco-2',
      publicCategoryKey: 'panaderia',
      publicLocationLabel: 'Belgrano, CABA',
      publicLatitude: -34.5621,
      publicLongitude: -58.4567
    }))
    expect(document.body.textContent).toContain('Discovery público actualizado.')
    expect((document.querySelector('input[aria-label="Label de ubicación pública"]') as HTMLInputElement).value).toBe('Belgrano, CABA')

    await cleanup()
  })

  it('shows discovery fields as read-only for store admins without owner role', async () => {
    mockFetch({
      '/api/auth/me': {
        body: {
          ...authMe,
          memberships: {
            stores: [{ storeId: 'store-1', storeSlug: 'demo-store', role: 'ADMIN', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 1,
          ordersByStatus: { PENDING_PAYMENT: 0, PAID: 1, CANCELLED: 0 },
          confirmedSalesTotalAmount: 100,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 1, CANCELLED: 0 },
          activeProducts: 1,
          inactiveProducts: 0
        }
      },
      '/api/store/analytics/report?range=7d': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 1,
            paymentsConfirmed: 1,
            manualCancellations: 0,
            stockConflicts: 0,
            fulfillmentsCreated: 1,
            confirmedSalesTotalAmount: 100,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 1, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': {
        body: {
          ...discoverySettings,
          actorRole: 'ADMIN'
        }
      },
      '/api/store/profile': {
        body: publicProfile
      },
      '/api/store/readiness': {
        body: readinessResponse
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('ADMIN sólo lectura')
    expect(document.body.textContent).toContain('restringida a `OWNER`')
    expect((document.querySelector('select[aria-label="Ecosystem asociado"]') as HTMLSelectElement).disabled).toBe(true)
    const discoverySubmit = Array.from(document.querySelectorAll('button[type="submit"]'))
      .find((button) => button.textContent?.includes('Guardar discovery público')) as HTMLButtonElement
    expect(discoverySubmit.disabled).toBe(true)

    await cleanup()
  })
})
