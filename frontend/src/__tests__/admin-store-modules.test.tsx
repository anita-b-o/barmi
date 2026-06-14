import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' },
      { storeId: 's2', storeSlug: 'legacy-store', role: 'ADMIN', status: 'INACTIVE' }
    ],
    ecosystems: []
  }
}

const capabilitiesResponse = {
  enabled: ['ABOUT', 'PRODUCTS', 'CHECKOUT', 'CONTACT'],
  available: [
    { key: 'ABOUT', label: 'Sobre mí', description: 'Presentá tu negocio o actividad.' },
    { key: 'GALLERY', label: 'Galería', description: 'Mostrá fotos, trabajos o ambientes.' },
    { key: 'BLOG', label: 'Blog', description: 'Publicá novedades o artículos.' },
    { key: 'PRODUCTS', label: 'Productos', description: 'Mostrá productos o menú.' },
    { key: 'RESERVATIONS', label: 'Reservas', description: 'Permití agenda o turnos.' },
    { key: 'PROMOTIONS', label: 'Promociones', description: 'Mostrá descuentos o beneficios.' },
    { key: 'SHIPPING', label: 'Envíos', description: 'Configurá cobertura y costos de envío.' },
    { key: 'CHECKOUT', label: 'Checkout', description: 'Permití compras online.' },
    { key: 'CONTACT', label: 'Contacto', description: 'Mostrá vías de contacto.' }
  ]
}

const discoveryResponse = {
  storeId: 's1',
  storeSlug: 'demo-store',
  storeName: 'Demo Store',
  actorRole: 'OWNER',
  ecosystem: null,
  publicCategoryKey: null,
  publicLocationLabel: null,
  publicLatitude: null,
  publicLongitude: null,
  ecosystems: [],
  categories: []
}

const analyticsSummaryResponse = {
  storeId: 's1',
  storeSlug: 'demo-store',
  totalOrders: 0,
  ordersByStatus: { PENDING_PAYMENT: 0, PAID: 0, CANCELLED: 0 },
  confirmedSalesTotalAmount: 0,
  confirmedSalesCurrency: null,
  fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 },
  activeProducts: 0,
  inactiveProducts: 0
}

const operationalReportResponse = {
  storeId: 's1',
  storeSlug: 'demo-store',
  rangeKey: '7d',
  rangeLabel: 'Últimos 7 días',
  from: '2026-03-01T00:00:00.000Z',
  to: '2026-03-08T00:00:00.000Z',
  timezone: 'America/Argentina/Buenos_Aires',
  periodMetrics: {
    ordersCreated: 0,
    paymentsConfirmed: 0,
    manualCancellations: 0,
    stockConflicts: 0,
    fulfillmentsCreated: 0,
    confirmedSalesTotalAmount: 0,
    confirmedSalesCurrency: null
  },
  currentSnapshot: {
    fulfillmentsByStatus: { PENDING: 0, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
  }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store modules', () => {
  it('renders toggles from backend state in light and dark themes', async () => {
    for (const preference of ['light', 'dark'] as const) {
      document.body.innerHTML = ''
      window.localStorage.setItem('barmi-theme-mode', preference)
      mockFetch({
        '/api/auth/me': { body: authMe },
        '/api/store/capabilities': { body: capabilitiesResponse }
      })

      const { cleanup } = await renderAppAt('/admin/store/modules')
      await flush()
      await flush()

      expect(document.documentElement.dataset.theme).toBe(preference)
      expect(document.body.textContent).toContain('Módulos de tu tienda')
      expect(document.body.textContent).toContain('Elegí qué querés mostrar en tu tienda pública.')
      expect(document.body.textContent).toContain('demo-store')
      expect(document.body.textContent).not.toContain('legacy-store')
      expect((document.querySelector('input[aria-label="Sobre mí"]') as HTMLInputElement).checked).toBe(true)
      expect((document.querySelector('input[aria-label="Galería"]') as HTMLInputElement).checked).toBe(false)

      await cleanup()
    }
  })

  it('saves selected capabilities and shows success feedback', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/capabilities': (url, init) => {
        if ((init?.method ?? 'GET') === 'PUT') {
          return {
            body: {
              ...capabilitiesResponse,
              enabled: ['ABOUT', 'GALLERY', 'PRODUCTS', 'CHECKOUT', 'CONTACT']
            }
          }
        }
        return { body: capabilitiesResponse }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/modules')
    await flush()
    await flush()

    await clickElement(document.querySelector('input[aria-label="Galería"]'))
    await clickElement(document.querySelector('input[aria-label="Promociones"]'))
    const saveButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar módulos'))
    await clickElement(saveButton)
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      enabled: ['ABOUT', 'GALLERY', 'PRODUCTS', 'PROMOTIONS', 'CHECKOUT', 'CONTACT']
    })
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Módulos de tienda guardados.')

    await cleanup()
  })

  it('shows save errors accessibly', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/capabilities': (url, init) => {
        if ((init?.method ?? 'GET') === 'PUT') {
          return {
            status: 400,
            body: {
              error: {
                code: 'invalid_capability',
                message: 'invalid_capability',
                status: 400
              }
            }
          }
        }
        return { body: capabilitiesResponse }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/modules')
    await flush()
    await flush()

    const saveButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar módulos'))
    await clickElement(saveButton)
    await flush()
    await flush()

    expect(document.querySelector('[role="alert"]')?.textContent).toContain('invalid_capability')

    await cleanup()
  })

  it('links to modules from the store admin hub', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/discovery': { body: discoveryResponse },
      '/api/store/analytics/summary': { body: analyticsSummaryResponse },
      '/api/store/analytics/report?range=7d': { body: operationalReportResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Módulos de tienda')
    const link = Array.from(document.querySelectorAll('a')).find((anchor) => anchor.textContent?.includes('Configurar módulos'))
    expect(link?.getAttribute('href')).toBe('/admin/store/modules')

    await cleanup()
  })
})
