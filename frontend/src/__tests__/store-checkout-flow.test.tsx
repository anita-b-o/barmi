import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setInputElementValue, setStoreCart } from '../test-utils/testUtils'

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
      '/api/public/stores/demo-store/products': {
        body: [
          { id: 'p1', name: 'Producto 1', sku: 'SKU1', priceCents: 1000, stockQuantity: 4, isAvailable: true }
        ]
      },
      '/api/public/stores/demo-store': {
        body: {
          slug: 'demo-store',
          id: 's1',
          name: 'Demo Store',
          promotions: [
            {
              code: 'BIENVENIDA10',
              type: 'PERCENTAGE',
              value: 10,
              shortLabel: 'BIENVENIDA10 · 10% OFF',
              expirationDate: '2026-04-01T12:00:00.000Z'
            }
          ]
        }
      },
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
          originalAmount: 15,
          discountAmount: 0,
          appliedCouponCode: null,
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

    expect(document.body.textContent).toContain('Compra simple, total transparente')
    expect(document.body.textContent).toContain('Promociones activas recordadas')
    expect(document.body.textContent).toContain('BIENVENIDA10 · BIENVENIDA10 · 10% OFF')

    const emailInput = Array.from(document.querySelectorAll('input'))
      .find((input) => input.getAttribute('type') === 'email') as HTMLInputElement | undefined
    expect(emailInput).toBeTruthy()
    await setInputElementValue(emailInput!, 'buyer@example.com')

    const quoteButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Calcular envío'))
    expect(quoteButton).toBeTruthy()
    await clickElement(quoteButton)
    await flush()

    expect(document.body.textContent).toContain('Envío disponible')
    expect(document.body.textContent).toContain('Zona aplicada: zone-1')
    expect(document.body.textContent).toContain('Disponible ahora')

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Crear orden y continuar'))
    expect(createButton).toBeTruthy()
    await clickElement(createButton)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/store/checkout/success')
    expect(document.body.textContent).toContain('Orden creada')
    expect(document.body.textContent).toContain('Gracias, tu pedido ya quedó creado')
    expect(document.body.textContent).toContain('order-1')
    expect(document.body.textContent).toContain('Zona')
    expect(document.body.textContent).toContain('Seguir esta orden')
    expect(document.body.textContent).toContain('Ver órdenes')
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/store/orders/order-1')).toBe(true)
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/store/orders')).toBe(true)

    const payButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Reintentar pago'))
    expect(payButton).toBeTruthy()
    await clickElement(payButton)
    await flush()
    await flush()

    expect(openSpy).toHaveBeenCalledWith('https://checkout.mercadopago.example/store', '_self')

    await cleanup()
  })

  it('applies a coupon preview and renders discounted totals', async () => {
    setStoreCart()
    mockFetch({
      '/api/public/stores/demo-store/products': {
        body: [
          { id: 'p1', name: 'Producto 1', sku: 'SKU1', priceCents: 1000, stockQuantity: 4, isAvailable: true }
        ]
      },
      '/api/public/stores/demo-store': {
        body: {
          slug: 'demo-store',
          id: 's1',
          name: 'Demo Store',
          promotions: [
            {
              code: 'BIENVENIDA10',
              type: 'PERCENTAGE',
              value: 10,
              shortLabel: 'BIENVENIDA10 · 10% OFF',
              expirationDate: '2026-04-01T12:00:00.000Z'
            }
          ]
        }
      },
      '/api/store/shipping/quote': {
        body: {
          postalCode: '1900',
          type: 'EXACT',
          zoneId: 'zone-1',
          costAmount: 5,
          currency: 'ARS'
        }
      },
      '/api/store/checkout/preview': {
        body: {
          subtotalAmount: 10,
          originalAmount: 15,
          discountAmount: 1.5,
          appliedCouponCode: 'BIENVENIDA10',
          totalAmount: 13.5,
          shippingCostAmount: 5,
          shippingCurrency: 'ARS',
          shippingZoneId: 'zone-1',
          shippingPostalCode: '1900',
          currency: 'ARS'
        }
      },
      '/api/store/checkout': {
        body: {
          totalAmount: 13.5,
          originalAmount: 15,
          discountAmount: 1.5,
          appliedCouponCode: 'BIENVENIDA10',
          createdAt: '2026-03-10T12:00:00.000Z',
          shippingZoneId: 'zone-1',
          orderId: 'order-2',
          shippingCurrency: 'ARS',
          shippingCostAmount: 5,
          currency: 'ARS',
          shippingPostalCode: '1900',
          subtotalAmount: 10,
          status: 'PENDING_PAYMENT'
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/checkout')
    await flush()

    const couponInput = Array.from(document.querySelectorAll('input'))
      .find((input) => input.getAttribute('placeholder')?.includes('BIENVENIDA10')) as HTMLInputElement | undefined
    expect(couponInput).toBeTruthy()
    await setInputElementValue(couponInput!, 'bienvenida10')

    const applyButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Aplicar'))
    expect(applyButton).toBeTruthy()
    await clickElement(applyButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Código BIENVENIDA10 aplicado.')
    expect(document.body.textContent).toContain('Descuento (BIENVENIDA10)')
    expect(document.body.textContent).toContain('Total final')
    expect(document.body.textContent).toContain('13,50')

    const emailInput = Array.from(document.querySelectorAll('input'))
      .find((input) => input.getAttribute('type') === 'email') as HTMLInputElement | undefined
    expect(emailInput).toBeTruthy()
    await setInputElementValue(emailInput!, 'promo@example.com')

    const quoteButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Calcular envío'))
    expect(quoteButton).toBeTruthy()
    await clickElement(quoteButton)
    await flush()

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Crear orden y continuar'))
    expect(createButton).toBeTruthy()
    await clickElement(createButton)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/store/checkout/success')
    expect(document.body.textContent).toContain('Descuento (BIENVENIDA10)')
    expect(document.body.textContent).toContain('Descuento aplicado')
    expect(document.body.textContent).toContain('Resumen de compra')
    expect(document.body.textContent).toContain('Seguir esta orden')

    await cleanup()
  })

  it('shows a clear error when checkout exceeds stock', async () => {
    setStoreCart()
    mockFetch({
      '/api/public/stores/demo-store/products': {
        body: [
          { id: 'p1', name: 'Producto 1', sku: 'SKU1', priceCents: 1000, stockQuantity: 4, isAvailable: true }
        ]
      },
      '/api/public/stores/demo-store': {
        body: {
          slug: 'demo-store',
          id: 's1',
          name: 'Demo Store',
          promotions: []
        }
      },
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
        status: 409,
        body: {
          error: {
            code: 'product_out_of_stock',
            message: 'Request failed',
            status: 409
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/checkout')
    await flush()

    const emailInput = Array.from(document.querySelectorAll('input'))
      .find((input) => input.getAttribute('type') === 'email') as HTMLInputElement | undefined
    expect(emailInput).toBeTruthy()
    await setInputElementValue(emailInput!, 'stock@example.com')

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Crear orden y continuar'))
    expect(createButton).toBeTruthy()
    expect((createButton as HTMLButtonElement).disabled).toBe(true)

    const quoteButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Calcular envío'))
    expect(quoteButton).toBeTruthy()
    await clickElement(quoteButton)
    await flush()

    expect((createButton as HTMLButtonElement).disabled).toBe(false)
    await clickElement(createButton)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/store/checkout')
    expect(document.body.textContent).toContain('Una o más cantidades superan el stock disponible.')

    await cleanup()
  })

  it('shows invalid coupon feedback without breaking checkout screen', async () => {
    setStoreCart()
    mockFetch({
      '/api/public/stores/demo-store/products': {
        body: [
          { id: 'p1', name: 'Producto 1', sku: 'SKU1', priceCents: 1000, stockQuantity: 4, isAvailable: true }
        ]
      },
      '/api/public/stores/demo-store': {
        body: {
          slug: 'demo-store',
          id: 's1',
          name: 'Demo Store',
          promotions: [
            {
              code: 'VENCIDO',
              type: 'FIXED',
              value: 5,
              shortLabel: 'VENCIDO · 5 ARS OFF',
              expirationDate: '2026-04-01T12:00:00.000Z'
            }
          ]
        }
      },
      '/api/store/checkout/preview': {
        status: 409,
        body: {
          error: {
            code: 'coupon_expired',
            message: 'Request failed',
            status: 409
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/checkout')
    await flush()

    const couponInput = Array.from(document.querySelectorAll('input'))
      .find((input) => input.getAttribute('placeholder')?.includes('BIENVENIDA10')) as HTMLInputElement | undefined
    expect(couponInput).toBeTruthy()
    await setInputElementValue(couponInput!, 'vencido')

    const applyButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Aplicar'))
    expect(applyButton).toBeTruthy()
    await clickElement(applyButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('El código de descuento venció.')
    expect(document.body.textContent).toContain('No válido')
    expect(window.location.pathname).toBe('/store/checkout')

    await cleanup()
  })

  it('updates subtotal when quantity changes inline in the cart', async () => {
    setStoreCart()
    mockFetch({
      '/api/public/stores/demo-store/products': {
        body: [
          { id: 'p1', name: 'Producto 1', sku: 'SKU1', priceCents: 1000, stockQuantity: 4, isAvailable: true }
        ]
      }
      ,
      '/api/public/stores/demo-store': {
        body: {
          slug: 'demo-store',
          id: 's1',
          name: 'Demo Store',
          promotions: []
        }
      }
    })

    const { cleanup } = await renderAppAt('/store/checkout')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Compra simple, total transparente')
    expect(document.body.textContent).toContain('Subtotal actual')
    expect(document.body.textContent).toContain('10,00')

    const quantityInput = Array.from(document.querySelectorAll('input'))
      .find((input) => input.getAttribute('type') === 'number') as HTMLInputElement | undefined
    expect(quantityInput).toBeTruthy()
    await setInputElementValue(quantityInput!, '3')
    await flush()

    expect(document.body.textContent).toContain('30,00')

    await cleanup()
  })
})
