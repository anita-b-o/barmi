import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [],
    ecosystems: [
      { ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' },
      { ecosystemId: 'eco-2', ecosystemSlug: 'legacy-ecosystem', role: 'ADMIN', status: 'INACTIVE' }
    ]
  }
}

const listResponse = [
  {
    fulfillmentId: 'ful-1',
    ecosystemOrderId: 'eco-order-1',
    ecosystemId: 'eco-1',
    status: 'PENDING',
    method: 'DELIVERY',
    createdAt: '2026-03-13T12:00:00Z'
  },
  {
    fulfillmentId: 'ful-2',
    ecosystemOrderId: 'eco-order-2',
    ecosystemId: 'eco-1',
    status: 'DELIVERED',
    method: 'DELIVERY',
    createdAt: '2026-03-13T12:05:00Z'
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

describe('admin ecosystem fulfillment', () => {
  it('renders the list with active ecosystem memberships', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/fulfillments?ecosystemId=eco-1': { body: listResponse }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/fulfillments?ecosystemId=eco-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Fulfillments Ecosystem')
    expect(document.body.textContent).toContain('eco-order-1')
    expect(document.body.textContent).toContain('demo-ecosystem')
    expect(document.body.textContent).not.toContain('legacy-ecosystem')

    await cleanup()
  })

  it('renders the detail and updates status', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/fulfillments/ful-1?ecosystemId=eco-1': { body: listResponse[0] },
      '/api/ecosystem/fulfillments/ful-1/status': {
        body: {
          ...listResponse[0],
          status: 'DISPATCHED'
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/fulfillments/ful-1?ecosystemId=eco-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Detalle de fulfillment Ecosystem')
    expect(document.body.textContent).toContain('eco-order-1')

    const dispatchButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Actualizar a DISPATCHED'))
    await clickElement(dispatchButton)
    await flush()
    await flush()

    const patchCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/ecosystem/fulfillments/ful-1/status' && init?.method === 'PATCH')
    expect(patchCall).toBeTruthy()
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ status: 'DISPATCHED' })
    expect(document.body.textContent).toContain('Estado actualizado a DISPATCHED.')

    await cleanup()
  })

  it('creates a fulfillment from ecosystem order detail', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/public/ecosystems/demo-ecosystem': {
        body: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' }
      },
      '/api/ecosystem/orders/eco-order-1': {
        body: {
          orderId: 'eco-order-1',
          status: 'PAID',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 120,
          shippingCostAmount: 30,
          totalAmount: 150,
          items: [
            {
              productId: 'ext-1',
              name: 'External Apple',
              qty: 1,
              unitPriceAmount: 120,
              lineTotalAmount: 120,
              currency: 'ARS'
            }
          ],
          shipping: {
            zoneId: 'zone-1',
            postalCode: '1900'
          },
          payment: {
            status: 'APPROVED',
            provider: 'MERCADOPAGO',
            providerPaymentId: 'pay-1',
            confirmedAt: '2026-03-10T12:01:00.000Z'
          }
        }
      },
      '/api/ecosystem/orders/eco-order-1/fulfillment': {
        status: 201,
        body: {
          fulfillmentId: 'ful-3',
          ecosystemOrderId: 'eco-order-1',
          ecosystemId: 'eco-1',
          status: 'PENDING',
          method: 'DELIVERY',
          createdAt: '2026-03-13T12:00:00Z'
        }
      },
      '/api/ecosystem/fulfillments/ful-3?ecosystemId=eco-1': {
        body: {
          fulfillmentId: 'ful-3',
          ecosystemOrderId: 'eco-order-1',
          ecosystemId: 'eco-1',
          status: 'PENDING',
          method: 'DELIVERY',
          createdAt: '2026-03-13T12:00:00Z'
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/orders/eco-order-1?ecosystemId=eco-1')
    await flush()
    await flush()

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear fulfillment'))
    await clickElement(createButton)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/admin/ecosystem/fulfillments/ful-3')
    expect(window.location.search).toContain('ecosystemId=eco-1')
    expect(document.body.textContent).toContain('Detalle de fulfillment Ecosystem')

    await cleanup()
  })

  it('shows backend errors visibly', async () => {
    const forbiddenAuthMe = {
      ...authMe,
      memberships: {
        ...authMe.memberships,
        ecosystems: [
          { ecosystemId: 'eco-9', ecosystemSlug: 'forbidden-ecosystem', role: 'OWNER', status: 'ACTIVE' }
        ]
      }
    }

    mockFetch({
      '/api/auth/me': { body: forbiddenAuthMe },
      '/api/ecosystem/fulfillments?ecosystemId=eco-9': {
        status: 403,
        body: {
          error: {
            code: 'forbidden',
            message: 'forbidden',
            status: 403
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/fulfillments?ecosystemId=eco-9')
    await flush()
    await flush()
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No tenés permisos para ver fulfillments de este ecosystem.')

    await cleanup()
  })

  it('shows drill-down context and applies createdAt filters in ecosystem fulfillments', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/fulfillments?ecosystemId=eco-1&createdFrom=2026-03-12T00%3A00%3A00.000Z&createdTo=2026-03-19T00%3A00%3A00.000Z': {
        body: listResponse
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/fulfillments?ecosystemId=eco-1&drilldownMetric=fulfillmentsCreated&rangeLabel=Ultimos+7+dias&createdFrom=2026-03-12T00:00:00.000Z&createdTo=2026-03-19T00:00:00.000Z')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Drill-down operativo activo')
    expect(document.body.textContent).toContain('Fulfillments creados')
    expect(document.body.textContent).toContain('eco-order-1')
    expect(handler.mock.calls.some(([url]) => String(url).includes('createdFrom=2026-03-12T00%3A00%3A00.000Z'))).toBe(true)

    await cleanup()
  })
})
