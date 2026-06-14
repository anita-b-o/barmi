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
  it('renders commerce analytics summary and top products table', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/commerce?range=7d': {
        body: {
          orders: 120,
          revenueCents: 850000,
          averageOrderValueCents: 7083,
          productsSold: 340,
          topProducts: [
            {
              productSlug: 'pan-de-campo',
              productName: 'Pan de campo',
              quantitySold: 80,
              revenueCents: 96000
            },
            {
              productSlug: 'cafe-molido',
              productName: 'Cafe molido',
              quantitySold: 12,
              revenueCents: 72000
            }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/analytics/commerce')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Commerce analytics')
    expect(document.body.textContent).toContain('Producto')
    expect(document.body.textContent).toContain('Ventas')
    expect(document.body.textContent).toContain('Funnel')
    expect(document.querySelector('a[href="/admin/store/analytics"]')?.getAttribute('aria-current')).toBeNull()
    expect(document.querySelector('a[href="/admin/store/analytics/commerce"]')?.getAttribute('aria-current')).toBe('page')
    expect(document.querySelector('a[href="/admin/store/analytics/funnel"]')?.getAttribute('aria-current')).toBeNull()
    expect(document.body.textContent).toContain('Store Commerce Analytics MVP')
    expect(document.body.textContent).toContain('Orders')
    expect(document.body.textContent).toContain('120')
    expect(document.body.textContent).toContain('Revenue')
    expect(document.body.textContent).toContain('$ 8.500,00')
    expect(document.body.textContent).toContain('Average Order Value')
    expect(document.body.textContent).toContain('$ 70,83')
    expect(document.body.textContent).toContain('Products Sold')
    expect(document.body.textContent).toContain('340')
    expect(document.body.textContent).toContain('Product')
    expect(document.body.textContent).toContain('Quantity Sold')
    expect(document.body.textContent).toContain('Pan de campo')
    expect(document.body.textContent).toContain('pan-de-campo')
    expect(document.body.textContent).toContain('$ 960,00')
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/store/analytics/commerce?range=7d'))).toBe(true)

    await cleanup()
  })

  it('renders commerce analytics empty state', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/commerce?range=7d': {
        body: {
          orders: 0,
          revenueCents: 0,
          averageOrderValueCents: 0,
          productsSold: 0,
          topProducts: []
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/analytics/commerce')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Sin ventas en los últimos 7 días')
    expect(document.body.textContent).toContain('$ 0,00')

    await cleanup()
  })

  it('renders the product analytics dashboard ordered by add to cart', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/products?range=7d': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-06-04T12:00:00.000Z',
          to: '2026-06-11T12:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          totals: {
            detailViews: 3,
            cardClicks: 5,
            addToCart: 1,
            ctrPercent: 60,
            addToCartRatePercent: 33.33
          },
          products: [
            {
              productSlug: 'apple',
              detailViews: 2,
              cardClicks: 4,
              addToCart: 1,
              ctrPercent: 50,
              addToCartRatePercent: 50
            },
            {
              productSlug: 'banana',
              detailViews: 1,
              cardClicks: 1,
              addToCart: 0,
              ctrPercent: 100,
              addToCartRatePercent: 0
            },
            {
              productSlug: 'zero-events',
              detailViews: 0,
              cardClicks: 0,
              addToCart: 0,
              ctrPercent: 0,
              addToCartRatePercent: 0
            }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/analytics')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Analytics de productos')
    expect(document.body.textContent).toContain('Producto')
    expect(document.body.textContent).toContain('Ventas')
    expect(document.body.textContent).toContain('Funnel')
    expect(document.querySelector('a[href="/admin/store/analytics"]')?.getAttribute('aria-current')).toBe('page')
    expect(document.querySelector('a[href="/admin/store/analytics/commerce"]')?.getAttribute('aria-current')).toBeNull()
    expect(document.querySelector('a[href="/admin/store/analytics/funnel"]')?.getAttribute('aria-current')).toBeNull()
    expect(document.body.textContent).toContain('Funnel público de productos')
    expect(document.body.textContent).toContain('Product Detail Views')
    expect(document.body.textContent).toContain('Product Card Clicks')
    expect(document.body.textContent).toContain('Add To Cart Rate')
    expect(document.body.textContent).toContain('33,33%')
    expect(document.body.textContent).toContain('apple')
    expect(document.body.textContent).toContain('banana')
    expect(document.body.textContent).toContain('zero-events')
    expect(document.body.textContent).toContain('100%')

    const bodyText = document.body.textContent ?? ''
    expect(bodyText.indexOf('apple')).toBeLessThan(bodyText.indexOf('banana'))
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/store/analytics/products?range=7d'))).toBe(true)

    await cleanup()
  })

  it('navigates between store analytics tabs without breaking loaded data', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/products?range=7d': {
        body: {
          storeId: 'store-1',
          storeSlug: 'demo-store',
          rangeKey: '7d',
          rangeLabel: 'Ultimos 7 dias',
          from: '2026-06-04T12:00:00.000Z',
          to: '2026-06-11T12:00:00.000Z',
          timezone: 'America/Argentina/Buenos_Aires',
          totals: {
            detailViews: 8,
            cardClicks: 4,
            addToCart: 2,
            ctrPercent: 50,
            addToCartRatePercent: 25
          },
          products: [
            {
              productSlug: 'apple',
              detailViews: 8,
              cardClicks: 4,
              addToCart: 2,
              ctrPercent: 50,
              addToCartRatePercent: 25
            }
          ]
        }
      },
      '/api/store/analytics/commerce?range=7d': {
        body: {
          orders: 3,
          revenueCents: 150000,
          averageOrderValueCents: 50000,
          productsSold: 7,
          topProducts: [
            {
              productSlug: 'apple',
              productName: 'Apple',
              quantitySold: 7,
              revenueCents: 150000
            }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/analytics')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Analytics de productos')
    expect(document.body.textContent).toContain('Product Detail Views')
    expect(document.querySelector('a[href="/admin/store/analytics"]')?.getAttribute('aria-current')).toBe('page')

    await clickElement(document.querySelector('a[href="/admin/store/analytics/commerce"]'))
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/admin/store/analytics/commerce')
    expect(document.body.textContent).toContain('Commerce analytics')
    expect(document.body.textContent).toContain('Orders')
    expect(document.body.textContent).toContain('3')
    expect(document.body.textContent).toContain('Apple')
    expect(document.querySelector('a[href="/admin/store/analytics"]')?.getAttribute('aria-current')).toBeNull()
    expect(document.querySelector('a[href="/admin/store/analytics/commerce"]')?.getAttribute('aria-current')).toBe('page')
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/store/analytics/products?range=7d'))).toBe(true)
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/store/analytics/commerce?range=7d'))).toBe(true)

    await cleanup()
  })

  it('renders funnel analytics summary and conversion table', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/funnel?range=7d': {
        body: {
          listViews: 1000,
          cardClicks: 400,
          detailViews: 320,
          addToCart: 80,
          orders: 25,
          revenueCents: 150000,
          clickRate: 0.4,
          detailRate: 0.8,
          addToCartRate: 0.25,
          purchaseRate: 0.3125
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/analytics/funnel')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Funnel analytics')
    expect(document.body.textContent).toContain('Producto')
    expect(document.body.textContent).toContain('Ventas')
    expect(document.body.textContent).toContain('Funnel')
    expect(document.querySelector('a[href="/admin/store/analytics"]')?.getAttribute('aria-current')).toBeNull()
    expect(document.querySelector('a[href="/admin/store/analytics/commerce"]')?.getAttribute('aria-current')).toBeNull()
    expect(document.querySelector('a[href="/admin/store/analytics/funnel"]')?.getAttribute('aria-current')).toBe('page')
    expect(document.body.textContent).toContain('List Views')
    expect(document.body.textContent).toContain('1000')
    expect(document.body.textContent).toContain('Card Clicks')
    expect(document.body.textContent).toContain('400')
    expect(document.body.textContent).toContain('Detail Views')
    expect(document.body.textContent).toContain('320')
    expect(document.body.textContent).toContain('Add To Cart')
    expect(document.body.textContent).toContain('80')
    expect(document.body.textContent).toContain('Orders')
    expect(document.body.textContent).toContain('25')
    expect(document.body.textContent).toContain('Revenue')
    expect(document.body.textContent).toContain('$ 1.500,00')
    expect(document.body.textContent).toContain('Click Rate')
    expect(document.body.textContent).toContain('40%')
    expect(document.body.textContent).toContain('Detail Rate')
    expect(document.body.textContent).toContain('80%')
    expect(document.body.textContent).toContain('Add To Cart Rate')
    expect(document.body.textContent).toContain('25%')
    expect(document.body.textContent).toContain('Purchase Rate')
    expect(document.body.textContent).toContain('31,25%')
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/store/analytics/funnel?range=7d'))).toBe(true)

    await cleanup()
  })

  it('renders funnel analytics empty state', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/analytics/funnel?range=7d': {
        body: {
          listViews: 0,
          cardClicks: 0,
          detailViews: 0,
          addToCart: 0,
          orders: 0,
          revenueCents: 0,
          clickRate: 0,
          detailRate: 0,
          addToCartRate: 0,
          purchaseRate: 0
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/analytics/funnel')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Sin datos de funnel en los últimos 7 días')
    expect(document.body.textContent).toContain('$ 0,00')
    expect(document.body.textContent).toContain('0%')

    await cleanup()
  })

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
