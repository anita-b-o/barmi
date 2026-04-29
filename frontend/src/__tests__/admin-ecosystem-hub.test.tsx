import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [],
    ecosystems: [
      { ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' },
      { ecosystemId: 'eco-2', ecosystemSlug: 'legacy-ecosystem', role: 'ADMIN', status: 'INACTIVE' }
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

describe('admin ecosystem hub', () => {
  it('uses /admin/ecosystem as an operational hub without duplicating product CRUD', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/analytics/summary?ecosystemId=eco-1': {
        body: {
          ecosystemId: 'eco-1',
          ecosystemSlug: 'demo-ecosystem',
          totalOrders: 2,
          ordersByStatus: { PENDING_PAYMENT: 1, PAID: 1, CANCELLED: 0 },
          confirmedSalesTotalAmount: 200,
          confirmedSalesCurrency: 'ARS',
          fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 },
          activeExternalProducts: 1,
          inactiveExternalProducts: 0
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
            ordersCreated: 2,
            paymentsConfirmed: 1,
            fulfillmentsCreated: 1,
            confirmedSalesTotalAmount: 200,
            confirmedSalesCurrency: 'ARS'
          },
          currentSnapshot: {
            fulfillmentsByStatus: { PENDING: 1, DISPATCHED: 0, DELIVERED: 0, CANCELLED: 0 }
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Hub operativo')
    expect(document.body.textContent).toContain('demo-ecosystem')
    expect(document.body.textContent).not.toContain('legacy-ecosystem')
    expect(document.body.textContent).toContain('Abrir órdenes')
    expect(document.body.textContent).toContain('Abrir fulfillments')
    expect(document.body.textContent).toContain('Gestionar productos')
    expect(document.body.textContent).toContain('Gestionar zonas')
    expect(document.body.textContent).toContain('Gestionar promociones')
    expect(document.body.textContent).toContain('Analytics MVP')
    expect(document.body.textContent).toContain('Reporting operativo MVP')
    expect(document.body.textContent).not.toContain('Crear producto')
    expect(document.body.textContent).not.toContain('Editar producto')

    const links = Array.from(document.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    expect(links).toContain('/admin/ecosystem/orders')
    expect(links).toContain('/admin/ecosystem/fulfillments')
    expect(links).toContain('/admin/ecosystem/products')
    expect(links).toContain('/admin/ecosystem/shipping')
    expect(links).toContain('/admin/ecosystem/promotions')

    await cleanup()
  })
})
