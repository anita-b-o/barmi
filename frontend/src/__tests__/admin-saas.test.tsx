import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setInputElementValue, setSelectElementValue } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [],
    ecosystems: []
  }
}

const plans = [
  {
    id: 'plan-free',
    code: 'FREE',
    name: 'Free',
    active: true,
    description: null,
    maxProducts: 50,
    analyticsEnabled: false,
    seoEnabled: false,
    createdAt: '2026-06-14T12:00:00Z',
    updatedAt: '2026-06-14T12:00:00Z'
  },
  {
    id: 'plan-pro',
    code: 'PRO',
    name: 'Pro',
    active: true,
    description: 'Plan pro',
    maxProducts: 200,
    analyticsEnabled: true,
    seoEnabled: true,
    createdAt: '2026-06-14T12:00:00Z',
    updatedAt: '2026-06-14T12:00:00Z'
  }
]

const subscriptions = [
  {
    subscriptionId: 'sub-1',
    storeId: 'store-1',
    storeSlug: 'demo-store',
    storeName: 'Demo Store',
    planId: 'plan-free',
    planCode: 'FREE',
    planName: 'Free',
    maxProducts: 50,
    analyticsEnabled: false,
    seoEnabled: false,
    status: 'ACTIVE',
    startedAt: '2026-06-14T12:00:00Z',
    expiresAt: null,
    createdAt: '2026-06-14T12:00:00Z',
    updatedAt: '2026-06-14T12:00:00Z'
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

describe('admin SaaS', () => {
  it('renders plans and subscriptions', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/admin/saas/plans': { body: plans },
      '/api/admin/saas/subscriptions': { body: subscriptions }
    })

    const { cleanup } = await renderAppAt('/admin/saas')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Planes SaaS')
    expect(document.body.textContent).toContain('FREE')
    expect(document.body.textContent).toContain('PRO')
    expect(document.body.textContent).toContain('demo-store')

    await cleanup()
  })

  it('creates a plan and changes a store plan', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/admin/saas/plans': (url, init) => {
        if ((init?.method ?? 'GET') === 'POST') {
          return {
            status: 201,
            body: {
              id: 'plan-basic',
              code: 'BASIC',
              name: 'Basic',
              active: true,
              description: null,
              maxProducts: 100,
              analyticsEnabled: true,
              seoEnabled: false,
              createdAt: '2026-06-14T12:00:00Z',
              updatedAt: '2026-06-14T12:00:00Z'
            }
          }
        }
        return { body: plans }
      },
      '/api/admin/saas/subscriptions/stores/store-1/plan': {
        body: { ...subscriptions[0], planId: 'plan-pro', planCode: 'PRO', planName: 'Pro', maxProducts: 200, analyticsEnabled: true, seoEnabled: true }
      },
      '/api/admin/saas/subscriptions': { body: subscriptions }
    })

    const { cleanup } = await renderAppAt('/admin/saas')
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    await setInputElementValue(inputs[0] as HTMLInputElement, 'BASIC')
    await setInputElementValue(inputs[1] as HTMLInputElement, 'Basic')
    await setInputElementValue(inputs[2] as HTMLInputElement, '100')
    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear plan'))
    await clickElement(createButton)
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/admin/saas/plans' && init?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      code: 'BASIC',
      name: 'Basic',
      maxProducts: 100
    })

    const planSelect = document.querySelector('select[aria-label="Plan para demo-store"]') as HTMLSelectElement
    await setSelectElementValue(planSelect, 'PRO')
    const changeButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Cambiar plan'))
    await clickElement(changeButton)
    await flush()
    await flush()

    const patchCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/admin/saas/subscriptions/stores/store-1/plan' && init?.method === 'PATCH')
    expect(patchCall).toBeTruthy()
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ planCode: 'PRO', status: 'ACTIVE' })

    await cleanup()
  })
})
