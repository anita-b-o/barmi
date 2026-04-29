import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setEcosystemCart } from '../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ecosystem checkout UI', () => {
  const openSpy = vi.fn()

  it('creates ecosystem order and reaches success screen', async () => {
    vi.stubGlobal('open', openSpy)
    setEcosystemCart()
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': {
        body: {
          id: 'eco-1',
          slug: 'demo-ecosystem',
          name: 'Demo Ecosystem'
        }
      },
      '/api/ecosystem/shipping/quote': {
        body: {
          ecosystemId: 'eco-1',
          postalCode: '1900',
          available: true,
          zoneId: 'zone-1',
          type: 'EXACT',
          costAmount: 30,
          currency: 'ARS'
        }
      },
      '/api/ecosystem/checkout': {
        body: {
          id: 'eco-order-1',
          ecosystemId: 'eco-1',
          status: 'PENDING_PAYMENT',
          currency: 'ARS',
          subtotalAmount: 120,
          originalAmount: 150,
          discountAmount: 0,
          appliedCouponCode: null,
          shippingCostAmount: 30,
          shippingCurrency: 'ARS',
          shippingZoneId: 'zone-1',
          shippingPostalCode: '1900',
          totalAmount: 150,
          createdAt: '2026-03-10T12:00:00.000Z'
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

    const { cleanup } = await renderAppAt('/ecosystem/checkout')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Marketplace claro, compra simple')
    expect(document.body.textContent).toContain('Producto Eco')

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Crear orden y continuar')) as HTMLButtonElement | undefined
    expect(createButton).toBeTruthy()
    expect(createButton?.disabled).toBe(true)

    const quoteButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Calcular envío'))
    expect(quoteButton).toBeTruthy()
    await clickElement(quoteButton)
    await flush()
    await flush()

    expect(createButton?.disabled).toBe(false)
    await clickElement(createButton)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/ecosystem/checkout/success')
    expect(document.body.textContent).toContain('Orden ecosystem creada')
    expect(document.body.textContent).toContain('Tu compra en el ecosystem ya quedó creada')
    expect(document.body.textContent).toContain('eco-order-1')
    expect(document.body.textContent).toContain('Ver órdenes')
    expect(document.body.textContent).toContain('Resumen de compra')
    expect(document.body.textContent).toContain('Seguir esta orden')
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/ecosystem/orders')).toBe(true)
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/ecosystem/orders/eco-order-1')).toBe(true)

    const payButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Reintentar pago'))
    expect(payButton).toBeTruthy()
    await clickElement(payButton)
    await flush()
    await flush()

    expect(openSpy).toHaveBeenCalledWith('https://checkout.mercadopago.example/eco', '_self')

    await cleanup()
  })
})
