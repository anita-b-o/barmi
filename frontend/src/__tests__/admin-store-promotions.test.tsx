import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearStorage,
  clickElement,
  flush,
  mockFetch,
  renderAppAt,
  setAuthSession,
  setInputElementValue,
  setSelectElementValue
} from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' },
      { storeId: 's2', storeSlug: 'legacy-store', role: 'ADMIN', status: 'INACTIVE' }
    ],
    ecosystems: []
  }
}

const promotionsResponse = [
  {
    id: 'promo-1',
    storeId: 's1',
    code: 'BIENVENIDA10',
    type: 'PERCENTAGE',
    value: 10,
    active: true,
    expirationDate: null,
    usageLimit: 100,
    usageCount: 12,
    createdAt: '2026-03-19T12:00:00.000Z'
  },
  {
    id: 'promo-2',
    storeId: 's1',
    code: 'FIJO500',
    type: 'FIXED',
    value: 500,
    active: false,
    expirationDate: '2026-04-01T12:00:00.000Z',
    usageLimit: null,
    usageCount: 3,
    createdAt: '2026-03-19T12:30:00.000Z'
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

describe('admin store promotions', () => {
  it('renders in light and dark themes without breaking the admin surface', async () => {
    for (const preference of ['light', 'dark'] as const) {
      document.body.innerHTML = ''
      window.localStorage.setItem('barmi-theme-mode', preference)

      mockFetch({
        '/api/auth/me': { body: authMe },
        '/api/store/promotions': { body: promotionsResponse }
      })

      const { cleanup } = await renderAppAt('/admin/store/promotions')
      await flush()
      await flush()

      expect(document.documentElement.dataset.theme).toBe(preference)
      expect(document.body.textContent).toContain('Promociones STORE')
      expect(document.body.textContent).toContain('Crear promoción')
      expect(document.body.textContent).toContain('BIENVENIDA10')
      expect(document.body.textContent).toContain('FIJO500')

      await cleanup()
    }
  })

  it('renders active stores, promotions, and basic form labels', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/promotions': { body: promotionsResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/promotions')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('demo-store')
    expect(document.body.textContent).not.toContain('legacy-store')
    expect(document.body.textContent).toContain('BIENVENIDA10')
    expect(document.body.textContent).toContain('Porcentaje')
    expect(document.body.textContent).toContain('FIJO500')
    expect(document.body.textContent).toContain('Monto fijo')
    expect(document.querySelector('input[aria-label="Código"]')).toBeTruthy()
    expect(document.querySelector('select[aria-label="Tipo"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Valor"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Vencimiento"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Límite de uso"]')).toBeTruthy()

    await cleanup()
  })

  it('shows empty state accessibly', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/promotions': { body: [] }
    })

    const { cleanup } = await renderAppAt('/admin/store/promotions')
    await flush()
    await flush()

    const statusRegions = Array.from(document.querySelectorAll('[role="status"]'))
    expect(document.body.textContent).toContain('No hay promociones creadas')
    expect(statusRegions.some((region) => region.textContent?.includes('No hay promociones creadas'))).toBe(true)

    await cleanup()
  })

  it('shows backend errors accessibly', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/promotions': {
        status: 409,
        body: {
          error: {
            code: 'promotion_code_conflict',
            message: 'promotion_code_conflict',
            status: 409
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/promotions')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('promotion_code_conflict')
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('promotion_code_conflict')

    await cleanup()
  })

  it('lists promotions and allows creating a new one', async () => {
    let listCalls = 0
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/promotions': (url, init) => {
        if ((init?.method ?? 'GET') === 'POST') {
          return {
            status: 201,
            body: {
              id: 'promo-2',
              storeId: 's1',
              code: 'BIENVENIDA10',
              type: 'PERCENTAGE',
              value: 10,
              active: true,
              expirationDate: null,
              usageLimit: 100,
              usageCount: 0,
              createdAt: '2026-03-19T12:00:00.000Z'
            }
          }
        }

        listCalls += 1
        return {
          body: listCalls === 1
            ? []
            : [{
                id: 'promo-2',
                storeId: 's1',
                code: 'BIENVENIDA10',
                type: 'PERCENTAGE',
                value: 10,
                active: true,
                expirationDate: null,
                usageLimit: 100,
                usageCount: 0,
                createdAt: '2026-03-19T12:00:00.000Z'
              }]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/promotions')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Promociones STORE')
    expect(document.body.textContent).toContain('No hay promociones creadas')

    const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
    const codeInput = inputs.find((input) => input.placeholder?.includes('BIENVENIDA10'))
    const valueInput = inputs.find((input) => input.placeholder === '10' || input.placeholder === '500')
    expect(codeInput).toBeTruthy()
    expect(valueInput).toBeTruthy()

    await setInputElementValue(codeInput!, 'bienvenida10')
    const typeSelect = document.querySelector('select[aria-label="Tipo"]') as HTMLSelectElement
    await setSelectElementValue(typeSelect, 'PERCENTAGE')
    await setInputElementValue(valueInput!, '10')
    const usageLimitInput = document.querySelector('input[aria-label="Límite de uso"]') as HTMLInputElement
    await setInputElementValue(usageLimitInput, '100')

    const submitButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear promoción'))
    expect(submitButton).toBeTruthy()
    await clickElement(submitButton)
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      code: 'bienvenida10',
      type: 'PERCENTAGE',
      value: 10,
      active: true,
      expirationDate: null,
      usageLimit: 100
    })
    expect(document.body.textContent).toContain('BIENVENIDA10')
    expect(document.body.textContent).toContain('Porcentaje')

    await cleanup()
  })
})
