import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

function ecosystemResponse() {
  return {
    id: 'eco-1',
    slug: 'demo-ecosystem',
    name: 'Demo Ecosystem'
  }
}

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

describe('ecosystem order payment tracking', () => {
  it('renders payment info when backend returns payment', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse() },
      '/api/ecosystem/orders/eco-paid-1': {
        body: {
          orderId: 'eco-paid-1',
          status: 'PAID',
          createdAt: '2026-03-10T12:00:00.000Z',
          currency: 'ARS',
          subtotalAmount: 120,
          shippingCostAmount: 30,
          totalAmount: 150,
          items: [
            { productId: 'ep1', name: 'Producto Eco', qty: 1, unitPriceAmount: 120, lineTotalAmount: 120, currency: 'ARS' }
          ],
          shipping: { zoneId: 'zone-1', postalCode: '1900' },
          payment: {
            status: 'CONFIRMED',
            provider: 'MERCADOPAGO',
            providerPaymentId: 'mp-eco-1',
            confirmedAt: '2026-03-10T12:05:00.000Z'
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-paid-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('El pago ya fue confirmado en backend.')
    expect(document.body.textContent).toContain('MERCADOPAGO')
    expect(document.body.textContent).toContain('mp-eco-1')
    expect(document.body.textContent).toContain('CONFIRMED')

    await cleanup()
  })

  it('shows pending payment state clearly when payment is still null', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse() },
      '/api/ecosystem/orders/eco-pending-1': {
        body: {
          orderId: 'eco-pending-1',
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

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-pending-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('La orden sigue pendiente de pago.')
    expect(document.body.textContent).toContain('Estado de pago')
    expect(document.body.textContent).toContain('PENDING')

    await cleanup()
  })

  it('polls automatically while the order remains pending and stops when it becomes paid', async () => {
    vi.useFakeTimers()
    let calls = 0

    const fetchMock = mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse() },
      '/api/ecosystem/orders/eco-track-1': () => {
        calls += 1
        if (calls < 3) {
          return {
            body: {
              orderId: 'eco-track-1',
              status: 'PENDING_PAYMENT',
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
        }

        return {
          body: {
            orderId: 'eco-track-1',
            status: 'PAID',
            createdAt: '2026-03-10T12:00:00.000Z',
            currency: 'ARS',
            subtotalAmount: 120,
            shippingCostAmount: 0,
            totalAmount: 120,
            items: [],
            shipping: null,
            payment: {
              status: 'CONFIRMED',
              provider: 'MERCADOPAGO',
              providerPaymentId: 'mp-track-1',
              confirmedAt: '2026-03-10T12:03:00.000Z'
            }
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-track-1')
    await advance(0)
    await advance(0)

    expect(calls).toBe(1)

    await advance(5000)
    await advance(0)
    expect(calls).toBe(2)

    await advance(5000)
    await advance(0)
    expect(calls).toBe(3)
    expect(document.body.textContent).toContain('El pago ya fue confirmado en backend.')

    await advance(15000)
    await advance(0)
    expect(calls).toBe(3)
    expect(fetchMock).toHaveBeenCalled()

    await cleanup()
  })

  it('stops polling when the screen unmounts', async () => {
    vi.useFakeTimers()
    let calls = 0

    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse() },
      '/api/ecosystem/orders/eco-unmount-1': () => {
        calls += 1
        return {
          body: {
            orderId: 'eco-unmount-1',
            status: 'PENDING_PAYMENT',
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
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-unmount-1')
    await advance(0)
    await advance(0)
    expect(calls).toBe(1)

    await cleanup()
    await advance(15000)
    await advance(0)

    expect(calls).toBe(1)
  })

  it('keeps manual refresh available and shows refresh errors', async () => {
    let calls = 0

    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse() },
      '/api/ecosystem/orders/eco-refresh-1': () => {
        calls += 1
        if (calls === 1) {
          return {
            body: {
              orderId: 'eco-refresh-1',
              status: 'PENDING_PAYMENT',
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

    const { cleanup } = await renderAppAt('/ecosystem/orders/eco-refresh-1')
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
