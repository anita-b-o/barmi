import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const storeResponse = { slug: 'demo-store', id: 's1', name: 'Demo Store' }
const productsResponse = [
  { priceCents: 1000, id: 'p1', name: 'Producto 1', sku: 'SKU1', stockQuantity: 4, isAvailable: true }
]

const authMeNoMemberships = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: { stores: [], ecosystems: [] }
}

const storeDiscoverySettings = {
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

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  mockFetch({
    '/api/public/stores/demo-store': { body: storeResponse },
    '/api/public/stores/demo-store/products': { body: productsResponse },
    '/api/auth/me': { body: authMeNoMemberships }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('router basics', () => {
  it('redirects / to public store', async () => {
    const { cleanup } = await renderAppAt('/')
    await flush()
    expect(document.body.textContent).toContain('Productos')
    await cleanup()
  })

  it('renders /public/demo-store', async () => {
    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    expect(document.body.textContent).toContain('Productos')
    expect(document.body.textContent).toContain('Catálogo')
    expect(document.body.textContent).not.toContain('Ecosystem')
    await cleanup()
  })

  it('allows retrying public store loading after an error', async () => {
    let productCalls = 0
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': () => {
        productCalls += 1
        if (productCalls <= 1) {
          return { status: 500, body: { code: 'unexpected_error', message: 'Error cargando store' } }
        }
        return { body: productsResponse }
      },
      '/api/auth/me': { body: authMeNoMemberships }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Error cargando store')

    const retryButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Reintentar'))
    expect(retryButton).toBeTruthy()
    await clickElement(retryButton)

    await flush()
    await flush()

    expect(document.body.textContent).toContain('Producto 1')
    await cleanup()
  })
  it('renders /ecosystem as the public ecosystem home', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/home': {
        body: {
          ecosystem: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] },
          newStores: [],
          promotionProducts: [],
          deliveryProducts: []
        }
      }
    })
    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()
    expect(document.body.textContent).toContain('Mapa')
    expect(document.body.textContent).toContain('Productos similares a tus compras')
    await cleanup()
  })

  it('renders /ecosystem/catalog', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] } },
      '/api/public/ecosystems/demo-ecosystem/products': { body: [] }
    })
    const { cleanup } = await renderAppAt('/ecosystem/catalog')
    await flush()
    await flush()
    expect(document.body.textContent).toContain('Demo Ecosystem')
    expect(document.body.textContent).toContain('Catálogo')
    await cleanup()
  })

  it('renders /ecosystem/stores/map', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        body: {
          ecosystem: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] },
          stores: []
        }
      }
    })
    const { cleanup } = await renderAppAt('/ecosystem/stores/map')
    await flush()
    await flush()
    expect(document.body.textContent).toContain('Cerca de mí')
    expect(document.body.textContent).toContain('Indumentaria')
    await cleanup()
  })

  it('renders /ecosystem/orders', async () => {
    mockFetch({
      '/api/ecosystem/orders?page=0&size=20': {
        body: {
          totalElements: 0,
          totalPages: 0,
          page: 0,
          size: 20,
          content: []
        }
      }
    })
    const { cleanup } = await renderAppAt('/ecosystem/orders')
    await flush()
    await flush()
    expect(document.body.textContent).toContain('Órdenes Ecosystem')
    await cleanup()
  })

  it('renders /auth/login', async () => {
    const { cleanup } = await renderAppAt('/auth/login')
    await flush()
    expect(document.body.textContent).toContain('Ingresar')
    await cleanup()
  })
})

describe('backoffice routing guards', () => {
  it('requires auth for /admin', async () => {
    const { cleanup } = await renderAppAt('/admin')
    await flush()
    expect(document.body.textContent).toContain('Ingresar')
    await cleanup()
  })

  it('requires store membership for /admin/store', async () => {
    setAuthSession()
    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    expect(document.body.textContent).toContain('Acceso denegado')
    await cleanup()
  })

  it('offers a clear ecosystem exit when the user lacks store permissions', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [],
            ecosystems: [{ ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' }]
          }
        }
      },
      '/api/store/analytics/summary': {
        body: {
          storeId: 's1',
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
          storeId: 's1',
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
        body: storeDiscoverySettings
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()

    expect(document.body.textContent).toContain('Acceso denegado')
    expect(document.body.textContent).toContain('Ir a ecosystem')

    await cleanup()
  })

  it('requires ecosystem membership for /admin/ecosystem', async () => {
    setAuthSession()
    const { cleanup } = await renderAppAt('/admin/ecosystem')
    await flush()
    expect(document.body.textContent).toContain('Acceso denegado')
    await cleanup()
  })

  it('renders /admin/shipping/zones for active store memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      },
      '/api/store/shipping/zones': {
        body: [
          {
            zoneId: 'z1',
            storeId: 's1',
            type: 'EXACT',
            postalCode: '1900',
            rangeStart: null,
            rangeEnd: null,
            costAmount: 10,
            currency: 'ARS',
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      }
    })

    const { cleanup } = await renderAppAt('/admin/shipping/zones')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Zonas de envío')
    expect(document.body.textContent).toContain('Crear zona')

    await cleanup()
  })

  it('renders /admin/store as a store hub for active store memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      },
      '/api/store/analytics/summary': {
        body: {
          storeId: 's1',
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
          storeId: 's1',
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
        body: storeDiscoverySettings
      }
    })

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Hub operativo')
    expect(document.body.textContent).toContain('Gestionar productos')
    expect(document.body.textContent).toContain('Gestionar promociones')
    expect(document.body.textContent).toContain('Gestionar zonas')
    expect(document.body.textContent).not.toContain('Crear zona')

    await cleanup()
  })

  it('renders /admin/store/products for active store memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      },
      '/api/store/products': {
        body: [
          {
            id: 'p1',
            storeId: 's1',
            sku: 'SKU1',
            name: 'Producto 1',
            priceCents: 1000,
            stockQuantity: 4,
            categoryId: null,
            categoryName: null,
            isAvailable: true,
            isActive: true,
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      },
      '/api/store/categories': {
        body: []
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Productos STORE')
    expect(document.body.textContent).toContain('Producto 1')
    expect(document.body.textContent).toContain('Crear producto')

    await cleanup()
  })

  it('renders /admin/store/promotions for active store memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      },
      '/api/store/promotions': {
        body: []
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/promotions')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Promociones STORE')
    expect(document.body.textContent).toContain('Crear promoción')

    await cleanup()
  })

  it('renders /admin/ecosystem/promotions for active ecosystem memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [],
            ecosystems: [{ ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' }]
          }
        }
      },
      '/api/ecosystem/admin/promotions?ecosystemId=eco-1': {
        body: []
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/promotions')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Promociones ECOSYSTEM')
    expect(document.body.textContent).toContain('Crear promoción')

    await cleanup()
  })

  it('renders /admin/fulfillments for active store memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/fulfillments')
    await flush()

    expect(document.body.textContent).toContain('Fulfillments STORE')

    await cleanup()
  })

  it('renders /admin/members for active store memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/members')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Store Members')

    await cleanup()
  })

  it('renders /admin/ecosystem/shipping for active ecosystem memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [],
            ecosystems: [{ ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' }]
          }
        }
      },
      '/api/ecosystem/admin/shipping/zones?ecosystemId=eco-1': {
        body: [
          {
            zoneId: 'zone-1',
            ecosystemId: 'eco-1',
            type: 'EXACT',
            postalCode: '1234',
            rangeStart: null,
            rangeEnd: null,
            costAmount: 150,
            currency: 'ARS',
            isActive: true,
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/shipping')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Zonas de envío ECOSYSTEM')
    expect(document.body.textContent).toContain('Crear zona')

    await cleanup()
  })

  it('renders /admin/ecosystem/fulfillments for active ecosystem memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [],
            ecosystems: [{ ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' }]
          }
        }
      },
      '/api/ecosystem/fulfillments?ecosystemId=eco-1': {
        body: [
          {
            fulfillmentId: 'ful-1',
            ecosystemOrderId: 'order-1',
            ecosystemId: 'eco-1',
            status: 'PENDING',
            method: 'DELIVERY',
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/fulfillments?ecosystemId=eco-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Fulfillments Ecosystem')
    expect(document.body.textContent).toContain('order-1')

    await cleanup()
  })

  it('renders /admin/ecosystem/products for active ecosystem memberships', async () => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [],
            ecosystems: [{ ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' }]
          }
        }
      },
      '/api/ecosystem/admin/products?ecosystemId=eco-1&activeOnly=false': {
        body: [
          {
            id: 'prod-1',
            ecosystemId: 'eco-1',
            name: 'Producto 1',
            priceAmount: 100,
            currency: 'ARS',
            deliverySupported: true,
            isActive: true,
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/products')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Productos externos ECOSYSTEM')
    expect(document.body.textContent).toContain('Crear producto')

    await cleanup()
  })
})
