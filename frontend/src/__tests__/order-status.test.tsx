import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

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
          originalAmount: 1200,
          discountAmount: 200,
          appliedCouponCode: 'BIENVENIDA20',
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
          },
          fulfillment: {
            fulfillmentId: 'f-1',
            status: 'DISPATCHED',
            method: 'STANDARD',
            createdAt: '2026-03-10T13:00:00.000Z'
          },
          timeline: []
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/orders/order-1')
    await flush()
    expect(document.body.textContent).toContain('Estado actual')
    expect(document.body.textContent).toContain('Pago confirmado')
    expect(document.body.textContent).toContain('Despachado')
    expect(document.body.textContent).toContain('Descuento (BIENVENIDA20)')
    await cleanup()
  })

  it('renders clearer labels in public store orders list', async () => {
    mockFetch({
      '/api/store/orders?page=0&size=20': {
        body: {
          totalElements: 2,
          totalPages: 1,
          page: 0,
          size: 20,
          content: [
            {
              orderId: 'order-pending',
              status: 'PENDING_PAYMENT',
              createdAt: '2026-03-10T12:00:00.000Z',
              totalAmount: 1100,
              currency: 'ARS',
              operationalIssue: null
            },
            {
              orderId: 'order-conflict',
              status: 'PENDING_PAYMENT',
              createdAt: '2026-03-10T12:05:00.000Z',
              totalAmount: 900,
              currency: 'ARS',
              operationalIssue: {
                code: 'STOCK_CONFLICT',
                title: 'Conflicto de stock post-pago',
                message: 'Pago confirmado con conflicto operativo de stock pendiente de revisión.',
                detectedAt: null,
                items: []
              }
            }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/orders')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Pago pendiente')
    expect(document.body.textContent).toContain('Pago confirmado con conflicto operativo')
    expect(document.body.textContent).toContain('Completar pago y seguimiento')
    expect(document.body.textContent).toContain('Ver seguimiento')

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
