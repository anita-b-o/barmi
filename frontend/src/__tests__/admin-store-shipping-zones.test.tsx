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

const zonesResponse = [
  {
    zoneId: 'zone-1',
    storeId: 's1',
    type: 'EXACT',
    postalCode: '1900',
    rangeStart: null,
    rangeEnd: null,
    costAmount: 10,
    currency: 'ARS',
    createdAt: '2026-03-10T12:00:00.000Z'
  },
  {
    zoneId: 'zone-2',
    storeId: 's1',
    type: 'RANGE',
    postalCode: null,
    rangeStart: 1000,
    rangeEnd: 1999,
    costAmount: 20,
    currency: 'ARS',
    createdAt: '2026-03-10T12:30:00.000Z'
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

describe('admin store shipping zones', () => {
  it('renders in light and dark themes without breaking the admin surface', async () => {
    for (const preference of ['light', 'dark'] as const) {
      document.body.innerHTML = ''
      window.localStorage.setItem('barmi-theme-mode', preference)

      mockFetch({
        '/api/auth/me': { body: authMe },
        '/api/store/shipping/zones': { body: zonesResponse }
      })

      const { cleanup } = await renderAppAt('/admin/shipping/zones')
      await flush()
      await flush()

      expect(document.documentElement.dataset.theme).toBe(preference)
      expect(document.body.textContent).toContain('Zonas de envío STORE')
      expect(document.body.textContent).toContain('Crear zona')
      expect(document.body.textContent).toContain('zone-1')
      expect(document.body.textContent).toContain('zone-2')
      const backLink = Array.from(document.querySelectorAll('a')).find((anchor) => anchor.textContent?.includes('Volver a publicar'))
      expect(backLink?.getAttribute('href')).toBe('/admin/store/publish')

      await cleanup()
    }
  })

  it('renders active stores, zones, and basic form labels', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/shipping/zones': { body: zonesResponse }
    })

    const { cleanup } = await renderAppAt('/admin/shipping/zones')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('demo-store')
    expect(document.body.textContent).not.toContain('legacy-store')
    expect(document.body.textContent).toContain('CP 1900')
    expect(document.body.textContent).toContain('Rango 1000-1999')
    expect(document.querySelector('select[aria-label="Tipo de zona"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Buscar por código o rango"]')).toBeTruthy()
    expect(document.querySelector('select[aria-label="Tipo"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Código postal"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Costo"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Moneda"]')).toBeTruthy()

    await cleanup()
  })

  it('shows empty state accessibly', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/shipping/zones': { body: [] }
    })

    const { cleanup } = await renderAppAt('/admin/shipping/zones')
    await flush()
    await flush()

    const statusRegions = Array.from(document.querySelectorAll('[role="status"]'))
    expect(document.body.textContent).toContain('No hay zonas configuradas')
    expect(statusRegions.some((region) => region.textContent?.includes('No hay zonas configuradas'))).toBe(true)

    await cleanup()
  })

  it('shows backend errors accessibly', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/shipping/zones': {
        status: 409,
        body: {
          error: {
            code: 'shipping_zone_duplicate',
            message: 'shipping_zone_duplicate',
            status: 409
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/shipping/zones')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('shipping_zone_duplicate')
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('shipping_zone_duplicate')

    await cleanup()
  })

  it('creates an exact shipping zone without changing the payload contract', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/shipping/zones': (url, init) => {
        if ((init?.method ?? 'GET') === 'POST') {
          return {
            status: 201,
            body: {
              zoneId: 'zone-3',
              storeId: 's1',
              type: 'EXACT',
              postalCode: '2000',
              rangeStart: null,
              rangeEnd: null,
              costAmount: 15,
              currency: 'ARS',
              createdAt: '2026-03-10T13:00:00.000Z'
            }
          }
        }
        return { body: [] }
      }
    })

    const { cleanup } = await renderAppAt('/admin/shipping/zones')
    await flush()
    await flush()

    const typeSelect = document.querySelector('select[aria-label="Tipo"]') as HTMLSelectElement
    await setSelectElementValue(typeSelect, 'EXACT')
    const postalCodeInput = document.querySelector('input[aria-label="Código postal"]') as HTMLInputElement
    const costInput = document.querySelector('input[aria-label="Costo"]') as HTMLInputElement
    const currencyInput = document.querySelector('input[aria-label="Moneda"]') as HTMLInputElement
    await setInputElementValue(postalCodeInput, '2000')
    await setInputElementValue(costInput, '15')
    await setInputElementValue(currencyInput, 'ARS')

    const submitButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear zona'))
    await clickElement(submitButton)
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      type: 'EXACT',
      postalCode: '2000',
      costAmount: 15,
      currency: 'ARS'
    })
    expect(document.body.textContent).toContain('Zona creada')
    expect(document.body.textContent).toContain('zone-3')

    await cleanup()
  })
})
