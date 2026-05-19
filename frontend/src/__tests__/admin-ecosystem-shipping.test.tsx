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
    stores: [],
    ecosystems: [
      { ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' },
      { ecosystemId: 'eco-2', ecosystemSlug: 'inactive-ecosystem', role: 'OWNER', status: 'INACTIVE' }
    ]
  }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin ecosystem shipping', () => {
  it('renders screen using active ecosystem memberships and loads the list', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
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
            createdAt: '2026-03-13T12:00:00Z'
          },
          {
            zoneId: 'zone-2',
            ecosystemId: 'eco-1',
            type: 'RANGE',
            postalCode: null,
            rangeStart: 1000,
            rangeEnd: 1999,
            costAmount: 200,
            currency: 'ARS',
            isActive: false,
            createdAt: '2026-03-13T12:05:00Z'
          }
        ]
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/shipping')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Ecosystem Shipping')
    expect(document.body.textContent).toContain('demo-ecosystem')
    expect(document.body.textContent).not.toContain('inactive-ecosystem')
    expect(document.body.textContent).toContain('zone-1')
    expect(document.body.textContent).not.toContain('zone-2')

    await cleanup()
  })

  it('creates an EXACT zone', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/shipping/zones?ecosystemId=eco-1': (url, init) => {
        if ((init?.method ?? 'GET') === 'GET') {
          return {
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
                createdAt: '2026-03-13T12:00:00Z'
              }
            ]
          }
        }

        return { status: 405 }
      },
      '/api/ecosystem/admin/shipping/zones': (url, init) => {
        if ((init?.method ?? 'GET') !== 'POST') return { status: 405 }
        return {
          status: 201,
          body: {
            zoneId: 'zone-new',
            ecosystemId: 'eco-1',
            type: 'EXACT',
            postalCode: '1406',
            rangeStart: null,
            rangeEnd: null,
            costAmount: 175,
            currency: 'ARS',
            isActive: true,
            createdAt: '2026-03-13T12:10:00Z'
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/shipping')
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    const postalCodeInput = inputs.find((input) => input.getAttribute('placeholder') === '1234') as HTMLInputElement
    const costInput = inputs.find((input) => input.getAttribute('placeholder') === '150.00') as HTMLInputElement
    const currencyInput = inputs.find((input) => input.getAttribute('placeholder') === 'ARS') as HTMLInputElement

    await setInputElementValue(postalCodeInput, '1406')
    await setInputElementValue(costInput, '175')
    await setInputElementValue(currencyInput, 'ARS')

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear zona'))
    await clickElement(createButton)
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(postCall?.[0]).toBe('/api/ecosystem/admin/shipping/zones')
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      ecosystemId: 'eco-1',
      type: 'EXACT',
      postalCode: '1406',
      costAmount: 175,
      currency: 'ARS'
    })
    expect(document.body.textContent).toContain('Zona creada')

    await cleanup()
  })

  it('creates a RANGE zone', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/shipping/zones?ecosystemId=eco-1': { body: [] },
      '/api/ecosystem/admin/shipping/zones': (url, init) => {
        if ((init?.method ?? 'GET') !== 'POST') return { status: 405 }
        return {
          status: 201,
          body: {
            zoneId: 'zone-range',
            ecosystemId: 'eco-1',
            type: 'RANGE',
            postalCode: null,
            rangeStart: 1000,
            rangeEnd: 1999,
            costAmount: 200,
            currency: 'ARS',
            isActive: true,
            createdAt: '2026-03-13T12:15:00Z'
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/shipping')
    await flush()
    await flush()

    const selects = Array.from(document.querySelectorAll('select'))
    const typeSelect = selects.find((item) => item.value === 'EXACT') as HTMLSelectElement
    await setSelectElementValue(typeSelect, 'RANGE')
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    const rangeStartInput = inputs.find((input) => input.getAttribute('placeholder') === '1000') as HTMLInputElement
    const rangeEndInput = inputs.find((input) => input.getAttribute('placeholder') === '1999') as HTMLInputElement
    const costInput = inputs.find((input) => input.getAttribute('placeholder') === '150.00') as HTMLInputElement
    const currencyInput = inputs.find((input) => input.getAttribute('placeholder') === 'ARS') as HTMLInputElement

    await setInputElementValue(rangeStartInput, '1000')
    await setInputElementValue(rangeEndInput, '1999')
    await setInputElementValue(costInput, '200')
    await setInputElementValue(currencyInput, 'ARS')

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear zona'))
    await clickElement(createButton)
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      ecosystemId: 'eco-1',
      type: 'RANGE',
      rangeStart: 1000,
      rangeEnd: 1999,
      costAmount: 200,
      currency: 'ARS'
    })

    await cleanup()
  })

  it('deletes a zone', async () => {
    let deleted = false
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/shipping/zones?ecosystemId=eco-1': () => {
        if (deleted) return { body: [] }
        return {
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
              createdAt: '2026-03-13T12:00:00Z'
            }
          ]
        }
      },
      '/api/ecosystem/admin/shipping/zones/zone-1?ecosystemId=eco-1': () => {
        deleted = true
        return { status: 204 }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/shipping')
    await flush()
    await flush()

    const deleteButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Eliminar'))
    await clickElement(deleteButton)
    await flush()

    const confirmButton = Array.from(document.querySelectorAll('button'))
      .filter((button) => button.textContent === 'Eliminar')
      .at(-1)
    await clickElement(confirmButton)
    await flush()
    await flush()

    const deleteCall = handler.mock.calls.find(([url, init]) => String(url).includes('/api/ecosystem/admin/shipping/zones/zone-1') && init?.method === 'DELETE')
    expect(deleteCall).toBeTruthy()
    expect(document.body.textContent).toContain('Zona eliminada')
    expect(document.body.textContent).not.toContain('zone-1')

    await cleanup()
  })

  it('shows backend error messages', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/shipping/zones?ecosystemId=eco-1': { body: [] },
      '/api/ecosystem/admin/shipping/zones': {
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

    const { cleanup } = await renderAppAt('/admin/ecosystem/shipping')
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    const postalCodeInput = inputs.find((input) => input.getAttribute('placeholder') === '1234') as HTMLInputElement
    const costInput = inputs.find((input) => input.getAttribute('placeholder') === '150.00') as HTMLInputElement
    const currencyInput = inputs.find((input) => input.getAttribute('placeholder') === 'ARS') as HTMLInputElement

    await setInputElementValue(postalCodeInput, '1234')
    await setInputElementValue(costInput, '150')
    await setInputElementValue(currencyInput, 'ARS')

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear zona'))
    await clickElement(createButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('shipping_zone_duplicate')

    await cleanup()
  })
})
