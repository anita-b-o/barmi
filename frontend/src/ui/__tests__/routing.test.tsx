import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../../test-utils/testUtils'

const storeResponse = { slug: 'demo-store', id: 's1', name: 'Demo Store' }
const productsResponse = [
  { priceCents: 1000, id: 'p1', name: 'Producto 1', sku: 'SKU1' }
]

const authMeNoMemberships = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: { stores: [], ecosystems: [] }
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
    await cleanup()
  })

  it('renders /ecosystem', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' } },
      '/api/public/ecosystems/demo-ecosystem/products': { body: [] }
    })
    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()
    expect(document.body.textContent).toContain('Demo Ecosystem')
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

    expect(document.body.textContent).toContain('Ecosystem Shipping')
    expect(document.body.textContent).toContain('Crear zona')

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

    expect(document.body.textContent).toContain('Ecosystem Products')
    expect(document.body.textContent).toContain('Crear producto')

    await cleanup()
  })
})
