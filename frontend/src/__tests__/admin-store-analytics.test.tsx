import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setSelectElementValue } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 'store-1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }
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
  ecosystems: [{ id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' }],
  categories: [{ key: 'cafeteria', label: 'Cafeteria' }]
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store analytics', () => {
  it('renders the store analytics summary in the hub', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 9,
          ordersByStatus: { PENDING_PAYMENT: 3, PAID: 5, CANCELLED: 1 },
          confirmedSalesTotalAmount: 4500,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 },
          activeProducts: 7,
          inactiveProducts: 2
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
            ordersCreated: 9,
            paymentsConfirmed: 5,
            manualCancellations: 1,
            stockConflicts: 2,
            fulfillmentsCreated: 4,
            confirmedSalesTotalAmount: 4500,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': {
        body: discoverySettings
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Analytics MVP')
    expect(document.body.textContent).toContain('Órdenes totales')
    expect(document.body.textContent).toContain('$ 4.500,00')
    expect(document.body.textContent).toContain('Productos activos')
    expect(document.body.textContent).toContain('PENDING_PAYMENT')
    expect(document.body.textContent).toContain('DISPATCHED')
    expect(document.body.textContent).toContain('Reporting operativo MVP')
    expect(document.body.textContent).toContain('Pagos confirmados')
    expect(document.body.textContent).toContain('Conflictos operativos')

    await cleanup()
  })

  it('changes reporting period from the selector', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 9,
          ordersByStatus: { PENDING_PAYMENT: 3, PAID: 5, CANCELLED: 1 },
          confirmedSalesTotalAmount: 4500,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 },
          activeProducts: 7,
          inactiveProducts: 2
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
            ordersCreated: 9,
            paymentsConfirmed: 5,
            manualCancellations: 1,
            stockConflicts: 2,
            fulfillmentsCreated: 4,
            confirmedSalesTotalAmount: 4500,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 }
          }
        }
      },
      '/api/store/analytics/report?range=today': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: 'today',
          rangeLabel: 'Hoy',
          from: '2026-03-19T00:00:00.000Z',
          to: '2026-03-19T12:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 2,
            paymentsConfirmed: 1,
            manualCancellations: 0,
            stockConflicts: 1,
            fulfillmentsCreated: 1,
            confirmedSalesTotalAmount: 1200,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': {
        body: discoverySettings
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    const periodSelect = document.querySelector('select[aria-label="Periodo del reporte operativo"]') as HTMLSelectElement
    expect(periodSelect).toBeTruthy()

    await setSelectElementValue(periodSelect, 'today')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Periodo: Hoy')
    expect(document.body.textContent).toContain('$ 1.200,00')
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/store/analytics/report?range=today'))).toBe(true)

    await cleanup()
  })

  it('navigates from a reporting metric to the filtered orders list', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          totalOrders: 9,
          ordersByStatus: { PENDING_PAYMENT: 3, PAID: 5, CANCELLED: 1 },
          confirmedSalesTotalAmount: 4500,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 },
          activeProducts: 7,
          inactiveProducts: 2
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
            ordersCreated: 9,
            paymentsConfirmed: 5,
            manualCancellations: 1,
            stockConflicts: 2,
            fulfillmentsCreated: 4,
            confirmedSalesTotalAmount: 4500,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/orders': { body: { totalElements: 0, totalPages: 0, page: 0, size: 10, content: [] } },
      '/api/store/admin/discovery': {
        body: discoverySettings
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    const metricLink = Array.from(document.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Pagos confirmados'))
    expect(metricLink).toBeTruthy()

    await clickElement(metricLink)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/admin/orders')
    expect(window.location.search).toContain('drilldownMetric=paymentsConfirmed')
    expect(window.location.search).toContain('paidFrom=2026-03-12T00%3A00%3A00.000Z')

    await cleanup()
  })

  it('shows a store analytics error message', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/summary': {
        status: 403,
        body: {
          error: {
            code: 'forbidden',
            message: 'forbidden',
            status: 403
          }
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
            ordersCreated: 9,
            paymentsConfirmed: 5,
            manualCancellations: 1,
            stockConflicts: 2,
            fulfillmentsCreated: 4,
            confirmedSalesTotalAmount: 4500,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 2, CANCELLED: 0 }
          }
        }
      },
      '/api/store/admin/discovery': {
        body: discoverySettings
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No tenés permisos para ver analytics de esta store.')

    await cleanup()
  })
})
