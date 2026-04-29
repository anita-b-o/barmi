import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setSelectElementValue } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [],
    ecosystems: [
      { ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'ECOSYSTEM_ADMIN', status: 'ACTIVE' }
    ]
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

describe('admin ecosystem analytics', () => {
  it('renders the ecosystem analytics summary in the hub', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/analytics/summary?ecosystemId=eco-1': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          totalOrders: 14,
          ordersByStatus: { PENDING_PAYMENT: 4, PAID: 8, CANCELLED: 2 },
          confirmedSalesTotalAmount: 8200,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 5, CANCELLED: 1 },
          activeExternalProducts: 11,
          inactiveExternalProducts: 3
        }
      },
      '/api/ecosystem/admin/analytics/report?ecosystemId=eco-1&range=7d': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 9,
            paymentsConfirmed: 5,
            fulfillmentsCreated: 4,
            confirmedSalesTotalAmount: 8200,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 5, CANCELLED: 1 }
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Analytics MVP')
    expect(document.body.textContent).toContain('Productos externos activos')
    expect(document.body.textContent).toContain('$ 8.200,00')
    expect(document.body.textContent).toContain('PENDING_PAYMENT')
    expect(document.body.textContent).toContain('DELIVERED')
    expect(document.body.textContent).toContain('Reporting operativo MVP')
    expect(document.body.textContent).toContain('Pagos confirmados')

    await cleanup()
  })

  it('changes ecosystem reporting period from the selector', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/analytics/summary?ecosystemId=eco-1': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          totalOrders: 14,
          ordersByStatus: { PENDING_PAYMENT: 4, PAID: 8, CANCELLED: 2 },
          confirmedSalesTotalAmount: 8200,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 5, CANCELLED: 1 },
          activeExternalProducts: 11,
          inactiveExternalProducts: 3
        }
      },
      '/api/ecosystem/admin/analytics/report?ecosystemId=eco-1&range=7d': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 9,
            paymentsConfirmed: 5,
            fulfillmentsCreated: 4,
            confirmedSalesTotalAmount: 8200,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 5, CANCELLED: 1 }
          }
        }
      },
      '/api/ecosystem/admin/analytics/report?ecosystemId=eco-1&range=today': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          rangeKey: 'today',
          rangeLabel: 'Hoy',
          from: '2026-03-19T00:00:00.000Z',
          to: '2026-03-19T12:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 2,
            paymentsConfirmed: 1,
            fulfillmentsCreated: 1,
            confirmedSalesTotalAmount: 1200,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 5, CANCELLED: 1 }
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem')
    await flush()
    await flush()

    const periodSelect = document.querySelector('select[aria-label="Periodo del reporte operativo ECOSYSTEM"]') as HTMLSelectElement
    expect(periodSelect).toBeTruthy()

    await setSelectElementValue(periodSelect, 'today')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Periodo: Hoy')
    expect(document.body.textContent).toContain('$ 1.200,00')
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/ecosystem/admin/analytics/report?ecosystemId=eco-1&range=today'))).toBe(true)

    await cleanup()
  })

  it('shows an ecosystem analytics error message', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/analytics/summary?ecosystemId=eco-1': {
        status: 403,
        body: {
          error: {
            code: 'forbidden',
            message: 'forbidden',
            status: 403
          }
        }
      },
      '/api/ecosystem/admin/analytics/report?ecosystemId=eco-1&range=7d': {
        status: 403,
        body: {
          error: {
            code: 'forbidden',
            message: 'forbidden',
            status: 403
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No tenés permisos para ver analytics de este ecosystem.')
    expect(document.body.textContent).toContain('No tenés permisos para ver reporting operativo de este ecosystem.')

    await cleanup()
  })

  it('navigates from operational metrics to ecosystem list drill-downs', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/analytics/summary?ecosystemId=eco-1': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          totalOrders: 14,
          ordersByStatus: { PENDING_PAYMENT: 4, PAID: 8, CANCELLED: 2 },
          confirmedSalesTotalAmount: 8200,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 5, CANCELLED: 1 },
          activeExternalProducts: 11,
          inactiveExternalProducts: 3
        }
      },
      '/api/ecosystem/admin/analytics/report?ecosystemId=eco-1&range=7d': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-03-12T00:00:00.000Z',
          to: '2026-03-19T00:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          periodMetrics: {
            ordersCreated: 9,
            paymentsConfirmed: 5,
            fulfillmentsCreated: 4,
            confirmedSalesTotalAmount: 8200,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 2, DELIVERED: 5, CANCELLED: 1 }
          }
        }
      },
      '/api/ecosystem/orders?page=0&size=20&ecosystemId=eco-1&paidFrom=2026-03-12T00%3A00%3A00.000Z&paidTo=2026-03-19T00%3A00%3A00.000Z': {
        body: { totalElements: 0, totalPages: 0, page: 0, size: 20, content: [] }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem')
    await flush()
    await flush()

    const paymentsMetricLink = Array.from(document.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Pagos confirmados'))
    await clickElement(paymentsMetricLink)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/admin/ecosystem/orders')
    expect(window.location.search).toContain('drilldownMetric=paymentsConfirmed')
    expect(window.location.search).toContain('ecosystemId=eco-1')

    await cleanup()
  })
})
