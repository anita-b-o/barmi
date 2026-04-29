import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('store payment handoff and tracking', () => {
  it('initiates payment from store order detail when the order is payable', async () => {
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)

    mockFetch({
      '/api/store/orders/order-1': {
        body: {
          orderId: 'order-1',
          status: 'PENDING_PAYMENT',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 1000,
          shippingCostAmount: 100,
          totalAmount: 1100,
          items: [],
          shipping: { zoneId: 'z1', postalCode: '1900' },
          payment: null,
          timeline: []
        }
      },
      '/api/store/payments/initiate': {
        body: {
          intentId: 'intent-store-1',
          scope: 'STORE',
          orderId: 'order-1',
          status: 'PENDING',
          amount: 1100,
          currency: 'ARS',
          createdAt: '2026-03-10T12:01:00.000Z',
          checkoutUrl: 'https://checkout.mercadopago.example/store',
          provider: 'MERCADOPAGO',
          providerPreferenceId: 'store-pref-1'
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/orders/order-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('La orden sigue pendiente')

    const payButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Reintentar pago'))
    expect(payButton).toBeTruthy()

    payButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(openSpy).toHaveBeenCalledWith('https://checkout.mercadopago.example/store', '_self')

    await cleanup()
  })

  it('shows non-payable message for paid store orders', async () => {
    mockFetch({
      '/api/store/orders/order-paid': {
        body: {
          orderId: 'order-paid',
          status: 'PAID',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 1000,
          shippingCostAmount: 0,
          totalAmount: 1000,
          items: [],
          shipping: null,
          payment: {
            status: 'CONFIRMED',
            provider: 'MERCADOPAGO',
            providerPaymentId: 'mp-store-1',
            confirmedAt: '2026-03-10T12:05:00.000Z'
          },
          timeline: []
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/orders/order-paid')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('El pago ya fue confirmado para esta orden.')
    expect(document.body.textContent).not.toContain('Reintentar pago')
    expect(document.body.textContent).toContain('MERCADOPAGO')

    await cleanup()
  })

  it('polls store order detail while pending and stops when it becomes paid', async () => {
    vi.useFakeTimers()
    let calls = 0

    mockFetch({
      '/api/store/orders/order-track': () => {
        calls += 1
        if (calls < 3) {
          return {
            body: {
              orderId: 'order-track',
              status: 'PENDING_PAYMENT',
              createdAt: '2026-03-10T12:00:00.000Z',
              currency: 'ARS',
              subtotalAmount: 1000,
              shippingCostAmount: 100,
              totalAmount: 1100,
              items: [],
              shipping: null,
              payment: null,
              timeline: []
            }
          }
        }

        return {
          body: {
            orderId: 'order-track',
            status: 'PAID',
            createdAt: '2026-03-10T12:00:00.000Z',
            currency: 'ARS',
            subtotalAmount: 1000,
            shippingCostAmount: 100,
            totalAmount: 1100,
            items: [],
            shipping: null,
              payment: {
                status: 'CONFIRMED',
                provider: 'MERCADOPAGO',
                providerPaymentId: 'mp-store-track',
                confirmedAt: '2026-03-10T12:03:00.000Z'
              },
              timeline: []
            }
          }
        }
    })

    const { cleanup } = await renderAppAt('/store/orders/order-track')
    await advance(0)
    await advance(0)

    expect(calls).toBe(1)

    await advance(5000)
    await advance(0)
    expect(calls).toBe(2)

    await advance(5000)
    await advance(0)
    expect(calls).toBe(3)
    expect(document.body.textContent).toContain('El pago ya fue confirmado. El siguiente paso es que el equipo prepare la orden.')

    await advance(15000)
    await advance(0)
    expect(calls).toBe(3)

    await cleanup()
  })

  it('stops store polling when the detail screen unmounts', async () => {
    vi.useFakeTimers()
    let calls = 0

    mockFetch({
      '/api/store/orders/order-unmount': () => {
        calls += 1
        return {
          body: {
            orderId: 'order-unmount',
            status: 'PENDING_PAYMENT',
            createdAt: '2026-03-10T12:00:00.000Z',
            currency: 'ARS',
            subtotalAmount: 1000,
            shippingCostAmount: 100,
            totalAmount: 1100,
            items: [],
            shipping: null,
            payment: null,
            timeline: []
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/orders/order-unmount')
    await advance(0)
    await advance(0)
    expect(calls).toBe(1)

    await cleanup()
    await advance(15000)
    await advance(0)

    expect(calls).toBe(1)
  })

  it('shows refresh errors and keeps manual refresh available', async () => {
    let calls = 0

    mockFetch({
      '/api/store/orders/order-refresh': () => {
        calls += 1
        if (calls === 1) {
          return {
            body: {
              orderId: 'order-refresh',
              status: 'PENDING_PAYMENT',
              createdAt: '2026-03-10T12:00:00.000Z',
              currency: 'ARS',
              subtotalAmount: 1000,
              shippingCostAmount: 0,
              totalAmount: 1000,
              items: [],
              shipping: null,
              payment: null,
              timeline: []
            }
          }
        }

        return {
          status: 500,
          body: {
            error: {
              code: 'http_error',
              message: 'No se pudo refrescar',
              status: 500
            }
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/orders/order-refresh')
    await flush()
    await flush()

    const refreshButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Actualizar'))
    refreshButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(calls).toBe(2)
    expect(document.body.textContent).toContain('No se pudo refrescar')

    await cleanup()
  })
})
