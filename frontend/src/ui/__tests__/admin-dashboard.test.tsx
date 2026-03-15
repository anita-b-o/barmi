import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../../test-utils/testUtils'

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
  it('renders operational store summary without redirecting', async () => {
    setAuthSession()
    mockFetch({
      '/api/auth/me': { body: authMeStore },
      '/api/store/orders': { body: { totalElements: 3, totalPages: 3, page: 0, size: 1, content: [] } },
      '/api/store/orders?status=PENDING_PAYMENT&page=0&size=1': { body: { totalElements: 1, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/store/orders?status=PAID&page=0&size=1': { body: { totalElements: 2, totalPages: 1, page: 0, size: 1, content: [] } },
      '/api/store/orders?status=CANCELLED&page=0&size=1': { body: { totalElements: 0, totalPages: 0, page: 0, size: 1, content: [] } }
    })

    const { cleanup } = await renderAppAt('/admin')
    await flush()
    await flush()
    expect(document.body.textContent).toContain('Backoffice')
    expect(document.body.textContent).toContain('Store: resumen operativo')
    expect(document.body.textContent).toContain('Ordenes totales')
    expect(document.body.textContent).toContain('Pedidos pagados')
    expect(document.body.textContent).toContain('Las ventas agregadas no se muestran aca')
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

  it('shows a consistent store summary error when the backend context is missing', async () => {
    setAuthSession()
    mockFetch({
      '/api/auth/me': { body: authMeStore },
      '/api/store/orders': {
        status: 400,
        body: {
          error: {
            code: 'store_context_required',
            message: 'Store context required.',
            status: 400
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Store context required. Abrí el FE en http://demo-store.example.com:5173')
    expect(document.body.textContent).toContain('Store: resumen operativo')
    await cleanup()
  })
})
