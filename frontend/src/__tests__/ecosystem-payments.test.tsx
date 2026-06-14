import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ecosystem payment handoff', () => {
  it('initiates payment from order detail when order is payable', async () => {
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)

    mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': {
        body: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' }
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
          shipping: null,
          payment: null
        }
      },
      '/api/ecosystem/payments/initiate': {
        body: {
          intentId: 'intent-eco-1',
          scope: 'ECOSYSTEM',
          orderId: 'eco-order-1',
          status: 'PENDING',
          amount: 150,
          currency: 'ARS',
          createdAt: '2026-03-10T12:01:00.000Z',
          checkoutUrl: 'https://checkout.mercadopago.example/eco',
          provider: 'MERCADOPAGO',
          providerPreferenceId: 'eco-pref-1'
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-order-1')
    await flush()
    await flush()

    const payButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Reintentar pago'))
    expect(payButton).toBeTruthy()

    payButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(openSpy).toHaveBeenCalledWith('https://checkout.mercadopago.example/eco', '_self')

    await cleanup()
  })

  it('shows non-payable message for paid orders', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': {
        body: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem' }
      },
      '/api/ecosystem/orders/eco-order-2': {
        body: {
          orderId: 'eco-order-2',
          status: 'PAID',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 120,
          shippingCostAmount: 0,
          totalAmount: 120,
          items: [],
          shipping: null,
          payment: null
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-order-2')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('El pago ya fue confirmado para esta orden.')
    expect(document.body.textContent).not.toContain('Reintentar pago')

    await cleanup()
  })
})
