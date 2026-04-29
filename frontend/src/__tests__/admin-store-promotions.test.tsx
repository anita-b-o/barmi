import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setInputElementValue } from '../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store promotions', () => {
  it('lists promotions and allows creating a new one', async () => {
    let listCalls = 0
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
    await setInputElementValue(valueInput!, '10')

    const submitButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear promoción'))
    expect(submitButton).toBeTruthy()
    await clickElement(submitButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('BIENVENIDA10')
    expect(document.body.textContent).toContain('Porcentaje')

    await cleanup()
  })
})
