import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMeBoth = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 'store-1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }
    ],
    ecosystems: [
      { ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' }
    ]
  }
}

const storeAnalyticsSummary = {
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

const storeOperationalReport = {
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
    { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' }
  ],
  categories: [
    { key: 'cafeteria', label: 'Cafeteria' }
  ]
}

function mockAdminChromeFetch() {
  mockFetch({
    '/api/auth/me': { body: authMeBoth },
    '/api/store/analytics/summary': { body: storeAnalyticsSummary },
    '/api/store/analytics/report?range=7d': { body: storeOperationalReport },
    '/api/store/admin/discovery': { body: discoverySettings }
  })
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-theme')
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin chrome design system migration', () => {
  it('renders AdminLayout with ThemeToggle and active nav aria-current', async () => {
    mockAdminChromeFetch()

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Barmi Admin')
    expect(document.querySelector('[role="radiogroup"][aria-label^="Tema visual"]')).toBeTruthy()
    expect(document.querySelector('a[href="/admin/store"]')?.getAttribute('aria-current')).toBe('page')
    expect(document.querySelectorAll('.barmi-admin-nav-link[aria-current="page"]').length).toBeGreaterThan(0)

    await cleanup()
  })

  it('keeps admin chrome renderable when switching between light and dark', async () => {
    mockAdminChromeFetch()

    const { cleanup } = await renderAppAt('/admin/store')
    await flush()

    await clickElement(document.querySelector('button[aria-label="Usar tema oscuro"]'))
    await flush()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.body.textContent).toContain('Hub Store')

    await clickElement(document.querySelector('button[aria-label="Usar tema claro"]'))
    await flush()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.body.textContent).toContain('Barmi Platform')

    await cleanup()
  })

  it('smokes the admin hub cards inside the migrated chrome', async () => {
    mockAdminChromeFetch()

    const { cleanup } = await renderAppAt('/admin')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Admin de Store')
    expect(document.body.textContent).toContain('Admin SaaS')
    expect(document.body.textContent).toContain('Admin de Ecosystem')
    expect(document.querySelector('a[href="/admin"]')?.getAttribute('aria-current')).toBe('page')

    await cleanup()
  })
})
