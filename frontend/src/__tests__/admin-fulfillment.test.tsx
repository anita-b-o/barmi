import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
    ecosystems: []
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

describe('admin fulfillment store', () => {
  it('renders /admin/fulfillments with real backend list', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/fulfillments': {
        body: [
          {
            fulfillmentId: 'f1',
            storeOrderId: 'order-1',
            storeId: 's1',
            status: 'PENDING',
            method: 'DELIVERY',
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      }
    })

    const { cleanup } = await renderAppAt('/admin/fulfillments')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Fulfillments STORE')
    expect(document.body.textContent).toContain('f1')
    expect(document.body.textContent).toContain('order-1')
    expect(document.body.textContent).toContain('DELIVERY')
    expect(document.body.textContent).not.toContain('no expone endpoints para listar fulfillments')

    await cleanup()
  })

  it('shows drill-down context and applies createdAt filters in the fulfillments list', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/fulfillments': {
        body: [
          {
            fulfillmentId: 'f1',
            storeOrderId: 'order-1',
            storeId: 's1',
            status: 'PENDING',
            method: 'DELIVERY',
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      }
    })

    const { cleanup } = await renderAppAt('/admin/fulfillments?drilldownMetric=fulfillmentsCreated&rangeLabel=Ultimos+7+dias&createdFrom=2026-03-12T00:00:00.000Z&createdTo=2026-03-19T00:00:00.000Z')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Drill-down operativo activo')
    expect(document.body.textContent).toContain('Fulfillments creados')
    expect(document.body.textContent).toContain('Ultimos 7 dias')

    const listCall = handler.mock.calls.find(([url]) => String(url).includes('/api/store/fulfillments?'))
    expect(String(listCall?.[0])).toContain('createdFrom=2026-03-12T00%3A00%3A00.000Z')
    expect(String(listCall?.[0])).toContain('createdTo=2026-03-19T00%3A00%3A00.000Z')

    await cleanup()
  })

  it('loads fulfillment detail from backend and updates status using PATCH', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/fulfillments/f1/status': {
        body: {
          fulfillmentId: 'f1',
          storeOrderId: 'order-1',
          storeId: 's1',
          status: 'DISPATCHED',
          method: 'DELIVERY',
          createdAt: '2026-03-10T12:00:00.000Z'
        }
      },
      '/api/store/fulfillments/f1': {
        body: {
          fulfillmentId: 'f1',
          storeOrderId: 'order-1',
          storeId: 's1',
          status: 'PENDING',
          method: 'DELIVERY',
          createdAt: '2026-03-10T12:00:00.000Z'
        }
      },
      '/api/store/admin/orders/order-1': {
        body: {
          orderId: 'order-1',
          status: 'PAID',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 800,
          shippingCostAmount: 200,
          totalAmount: 1000,
          items: [
            { productId: 'p1', name: 'Producto 1', qty: 1, unitPriceAmount: 800, lineTotalAmount: 800, currency: 'ARS' }
          ],
          shipping: { zoneId: 'zone-1', postalCode: '1900' },
          payment: null,
          timeline: [
            { code: 'ORDER_CREATED', title: 'Orden creada', description: 'La orden STORE quedó registrada en backend.', occurredAt: '2026-03-10T12:00:00.000Z' }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/fulfillments/f1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Detalle de fulfillment STORE')
    expect(document.body.textContent).toContain('order-1')
    expect(document.body.textContent).toContain('DELIVERY')
    expect(document.body.textContent).toContain('Actualizar a DISPATCHED')
    expect(document.body.textContent).not.toContain('No hay estado actual confirmado')
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/admin/orders/order-1')).toBe(true)

    const actionButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Actualizar a DISPATCHED'))
    expect(actionButton).toBeTruthy()
    await clickElement(actionButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Estado actualizado a DISPATCHED.')

    const patchCall = handler.mock.calls.find((call) => {
      const init = call[1] as RequestInit | undefined
      return String(call[0]).includes('/api/store/fulfillments/f1/status') && init?.method === 'PATCH'
    })
    expect(patchCall).toBeTruthy()

    const orderLink = Array.from(document.querySelectorAll('a'))
      .find((link) => link.getAttribute('href') === '/admin/orders/order-1')
    expect(orderLink).toBeTruthy()
    await clickElement(orderLink)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/admin/orders/order-1')
    expect(document.body.textContent).toContain('Detalle de orden STORE')

    await cleanup()
  })
})
