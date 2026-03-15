import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('order status UI', () => {
  it('renders order and payment status for store order detail', async () => {
    mockFetch({
      '/api/store/orders/order-1': {
        body: {
          orderId: 'order-1',
          status: 'PAID',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 1000,
          shippingCostAmount: 0,
          totalAmount: 1000,
          items: [
            { productId: 'p1', name: 'Producto 1', qty: 1, unitPriceAmount: 1000, lineTotalAmount: 1000, currency: 'ARS' }
          ],
          shipping: { zoneId: 'z1', postalCode: '1900' },
          payment: {
            status: 'CONFIRMED',
            provider: 'MERCADOPAGO',
            providerPaymentId: 'mp-1',
            confirmedAt: '2026-03-10T12:05:00.000Z'
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/orders/order-1')
    await flush()
    expect(document.body.textContent).toContain('Order Status')
    expect(document.body.textContent).toContain('Payment Status')
    expect(document.body.textContent).toContain('APPROVED')
    await cleanup()
  })

  it('renders order and payment status for ecosystem order detail', async () => {
    mockFetch({
      '/api/ecosystem/orders/eco-1': {
        body: {
          orderId: 'eco-1',
          status: 'PENDING_PAYMENT',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 120,
          shippingCostAmount: 0,
          totalAmount: 120,
          items: [
            { productId: 'ep1', name: 'Producto Eco', qty: 1, unitPriceAmount: 120, lineTotalAmount: 120, currency: 'ARS' }
          ],
          shipping: null,
          payment: null
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-1')
    await flush()
    expect(document.body.textContent).toContain('Estado actual')
    expect(document.body.textContent).toContain('Estado de pago')
    expect(document.body.textContent).toContain('PENDING')
    await cleanup()
  })
})
