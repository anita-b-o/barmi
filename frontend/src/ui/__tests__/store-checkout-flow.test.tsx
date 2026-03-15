import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setStoreCart } from '../../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('store checkout flow', () => {
  it('quotes shipping, creates order and navigates to success screen', async () => {
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)

    setStoreCart()
    mockFetch({
      '/api/store/shipping/quote': {
        body: {
          postalCode: '1900',
          type: 'EXACT',
          zoneId: 'zone-1',
          costAmount: 5,
          currency: 'ARS'
        }
      },
      '/api/store/checkout': {
        body: {
          totalAmount: 15,
          createdAt: '2026-03-10T12:00:00.000Z',
          shippingZoneId: 'zone-1',
          orderId: 'order-1',
          shippingCurrency: 'ARS',
          shippingCostAmount: 5,
          currency: 'ARS',
          shippingPostalCode: '1900',
          subtotalAmount: 10,
          status: 'PENDING_PAYMENT'
        }
      },
      '/api/store/payments/initiate': {
        body: {
          intentId: 'intent-store-1',
          scope: 'STORE',
          orderId: 'order-1',
          status: 'PENDING',
          amount: 15,
          currency: 'ARS',
          createdAt: '2026-03-10T12:01:00.000Z',
          checkoutUrl: 'https://checkout.mercadopago.example/store',
          provider: 'MERCADOPAGO',
          providerPreferenceId: 'store-pref-1'
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/checkout')
    await flush()

    const quoteButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Cotizar envío'))
    expect(quoteButton).toBeTruthy()
    quoteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(document.body.textContent).toContain('Envío disponible')
    expect(document.body.textContent).toContain('Zona aplicada: zone-1')

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Crear orden'))
    expect(createButton).toBeTruthy()
    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/store/checkout/success')
    expect(document.body.textContent).toContain('Orden creada')
    expect(document.body.textContent).toContain('order-1')
    expect(document.body.textContent).toContain('Zona')
    expect(document.body.textContent).toContain('Ir al detalle')
    expect(document.body.textContent).toContain('Ver órdenes')
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/store/orders/order-1')).toBe(true)
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/store/orders')).toBe(true)

    const payButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Reintentar pago'))
    expect(payButton).toBeTruthy()
    payButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(openSpy).toHaveBeenCalledWith('https://checkout.mercadopago.example/store', '_self')

    await cleanup()
  })
})
