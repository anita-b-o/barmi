import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'operator@example.com',
  memberships: {
    stores: [],
    ecosystems: []
  }
}

const stores = [
  {
    storeId: 'store-ready',
    storeSlug: 'ready-store',
    storeName: 'Ready Store',
    readinessScore: 100,
    publishReady: true,
    betaStatus: 'READY',
    appearancePreset: 'MODERN',
    capabilitiesEnabled: ['ABOUT', 'CONTACT', 'PRODUCTS', 'SHIPPING', 'CHECKOUT'],
    createdAt: '2026-06-16T12:00:00Z'
  },
  {
    storeId: 'store-progress',
    storeSlug: 'progress-store',
    storeName: 'Progress Store',
    readinessScore: 50,
    publishReady: false,
    betaStatus: 'IN_PROGRESS',
    appearancePreset: 'CLASSIC',
    capabilitiesEnabled: ['ABOUT', 'CONTACT'],
    createdAt: '2026-06-15T12:00:00Z'
  },
  {
    storeId: 'store-empty',
    storeSlug: 'empty-store',
    storeName: 'Empty Store',
    readinessScore: 0,
    publishReady: false,
    betaStatus: 'NOT_STARTED',
    appearancePreset: 'MINIMAL',
    capabilitiesEnabled: [],
    createdAt: '2026-06-14T12:00:00Z'
  }
]

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin beta launch toolkit', () => {
  it('renders metrics, badges and table rows', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/admin/beta/stores': { body: stores }
    })

    const { cleanup } = await renderAppAt('/admin/beta')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Beta Launch Toolkit')
    expect(document.body.textContent).toContain('Total stores')
    expect(document.body.textContent).toMatch(/Total stores\s*3/)
    expect(document.body.textContent).toMatch(/Ready\s*1/)
    expect(document.body.textContent).toMatch(/In Progress\s*1/)
    expect(document.body.textContent).toMatch(/Not Started\s*1/)
    expect(document.body.textContent).toContain('Ready Store')
    expect(document.body.textContent).toContain('Tienda online')
    expect(document.body.textContent).toContain('Progress Store')
    expect(document.body.textContent).toContain('Ready')
    expect(document.body.textContent).toContain('In Progress')
    expect(document.body.textContent).toContain('Not Started')

    await cleanup()
  })

  it('filters stores by readiness status', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/admin/beta/stores': { body: stores }
    })

    const { cleanup } = await renderAppAt('/admin/beta')
    await flush()
    await flush()

    const inProgressButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent === 'In Progress')
    await clickElement(inProgressButton)
    await flush()

    expect(document.body.textContent).toContain('Progress Store')
    expect(document.body.textContent).not.toContain('Ready Store')
    expect(document.body.textContent).not.toContain('Empty Store')

    const notStartedButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent === 'Not Started')
    await clickElement(notStartedButton)
    await flush()

    expect(document.body.textContent).toContain('Empty Store')
    expect(document.body.textContent).not.toContain('Progress Store')

    await cleanup()
  })
})
