import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ecosystem orders flow', () => {
  it('renders public ecosystem orders list and detail', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { slug: 'demo-store', id: 's1', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/ecosystem/orders?page=0&size=20': {
        body: {
          totalElements: 1,
          totalPages: 1,
          page: 0,
          size: 20,
          content: [
            {
              orderId: 'eco-order-1',
              status: 'PENDING_PAYMENT',
              createdAt: '2026-03-10T12:00:00.000Z',
              totalAmount: 150,
              currency: 'ARS'
            }
          ]
        }
      },
      '/api/ecosystem/orders/eco-order-1': {
        body: {
          orderId: 'eco-order-1',
          status: 'PENDING_PAYMENT',
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
          payment: null
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/orders')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Órdenes Ecosystem')
    expect(document.body.textContent).toContain('eco-order-1')
    expect(document.body.textContent).toContain('PENDING_PAYMENT')
    expect(document.body.textContent).toContain('Seguir pago')

    const detailLink = Array.from(document.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Seguir pago'))
    expect(detailLink?.getAttribute('href')).toBe('/ecosystem/orders/eco-order-1')

    await cleanup()

    const detail = await renderAppAt('/ecosystem/orders/eco-order-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Detalle de orden ecosystem')
    expect(document.body.textContent).toContain('External Apple')
    expect(document.body.textContent).toContain('1900')
    expect(document.body.textContent).toContain('Volver a órdenes')

    await detail.cleanup()
  })
})
