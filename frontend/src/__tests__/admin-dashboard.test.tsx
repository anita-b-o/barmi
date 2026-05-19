import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMeStore = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }
    ],
    ecosystems: []
  }
}

const authMeBoth = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }
    ],
    ecosystems: [
      { ecosystemId: 'e1', ecosystemSlug: 'demo-eco', role: 'ECOSYSTEM_ADMIN', status: 'ACTIVE' }
    ]
  }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin dashboard', () => {
  it('renders the store access hub and host-aware summary guidance without redirecting', async () => {
    setAuthSession()
    mockFetch({
      '/api/auth/me': { body: authMeStore }
    })

    const { cleanup } = await renderAppAt('/admin')
    await flush()
    await flush()
    expect(document.body.textContent).toContain('Backoffice')
    expect(document.body.textContent).toContain('Store: resumen operativo')
    expect(document.body.textContent).toContain('El resumen STORE sólo se carga dentro del host de una tienda')
    expect(document.body.textContent).not.toContain('Ordenes totales')
    await cleanup()
  })

  it('renders both store and ecosystem access hubs with summaries', async () => {
    setAuthSession()
    mockFetch({
      '/api/auth/me': { body: authMeBoth },
      '/api/store/orders': { body: { totalElements: 4, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/store/orders?status=PENDING_PAYMENT&page=0&size=1': { body: { totalElements: 1, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/store/orders?status=PAID&page=0&size=1': { body: { totalElements: 2, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/store/orders?status=CANCELLED&page=0&size=1': { body: { totalElements: 1, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/ecosystem/orders?page=0&size=1': { body: { totalElements: 5, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/ecosystem/orders?status=PENDING_PAYMENT&page=0&size=1': { body: { totalElements: 2, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/ecosystem/orders?status=PAID&page=0&size=1': { body: { totalElements: 2, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/ecosystem/orders?status=CANCELLED&page=0&size=1': { body: { totalElements: 1, totalPages: 1, page: 0, size: 1, content: [] } }
    })

    const { cleanup } = await renderAppAt('/admin')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Admin de Store')
    expect(document.body.textContent).toContain('Admin de Ecosystem')
    expect(document.body.textContent).toContain('Store: resumen operativo')
    expect(document.body.textContent).toContain('Ecosystem: resumen operativo')
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/admin/store')).toBe(true)
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/admin/ecosystem')).toBe(true)
    await cleanup()
  })

  it('keeps the store summary gated on the general host instead of firing store-scoped requests', async () => {
    setAuthSession()
    const fetchSpy = mockFetch({
      '/api/auth/me': { body: authMeStore }
    })

    const { cleanup } = await renderAppAt('/admin')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Store: resumen operativo')
    expect(document.body.textContent).toContain('El resumen STORE sólo se carga dentro del host de una tienda')
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/store/orders'))).toBe(false)
    await cleanup()
  })
})
