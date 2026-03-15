import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setEcosystemCart } from '../../test-utils/testUtils'

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
          shippingCostAmount: 30,
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

    expect(document.body.textContent).toContain('Producto Eco')

    const quoteButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Cotizar envío'))
    expect(quoteButton).toBeTruthy()
    quoteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Crear orden ecosystem'))
    expect(createButton).toBeTruthy()
    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/ecosystem/checkout/success')
    expect(document.body.textContent).toContain('Orden ecosystem creada')
    expect(document.body.textContent).toContain('eco-order-1')
    expect(document.body.textContent).toContain('Ver órdenes')
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/ecosystem/orders')).toBe(true)

    const payButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Reintentar pago'))
    expect(payButton).toBeTruthy()
    payButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(openSpy).toHaveBeenCalledWith('https://checkout.mercadopago.example/eco', '_self')

    await cleanup()
  })
})
