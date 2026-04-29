import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setEcosystemCart, setInputElementValue } from '../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setEcosystemCart()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ecosystem checkout flow', () => {
  it('applies coupon preview and renders discounted totals', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': {
        body: {
          id: 'eco-1',
          slug: 'demo-ecosystem',
          name: 'Demo Ecosystem',
          promotions: [
            {
              code: 'BIENVENIDA10',
              type: 'PERCENTAGE',
              value: 10,
              shortLabel: 'BIENVENIDA10 · 10% OFF',
              expirationDate: '2026-12-31T23:59:59Z'
            }
          ]
        }
      },
      '/api/ecosystem/shipping/quote?ecosystemId=eco-1&postalCode=1900': {
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
      '/api/ecosystem/checkout/preview': {
        body: {
          subtotalAmount: 120,
          originalAmount: 150,
          discountAmount: 15,
          appliedCouponCode: 'BIENVENIDA10',
          totalAmount: 135,
          currency: 'ARS',
          shippingCostAmount: 30,
          shippingCurrency: 'ARS',
          shippingZoneId: 'zone-1',
          shippingPostalCode: '1900'
        }
      },
      '/api/ecosystem/checkout': {
        status: 201,
        body: {
          id: 'eco-order-1',
          ecosystemId: 'eco-1',
          status: 'PENDING_PAYMENT',
          subtotalAmount: 120,
          originalAmount: 150,
          discountAmount: 15,
          appliedCouponCode: 'BIENVENIDA10',
          totalAmount: 135,
          currency: 'ARS',
          shippingCostAmount: 30,
          shippingCurrency: 'ARS',
          shippingZoneId: 'zone-1',
          shippingPostalCode: '1900',
          createdAt: '2026-03-19T12:00:00.000Z'
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/checkout')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Marketplace claro, compra simple')
    const postalInput = Array.from(document.querySelectorAll('input')).find((input) => input.placeholder === 'Código postal') as HTMLInputElement | undefined
    expect(postalInput).toBeTruthy()
    await setInputElementValue(postalInput!, '1900')

    const quoteButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Calcular envío'))
    await clickElement(quoteButton)
    await flush()
    await flush()

    const couponInput = Array.from(document.querySelectorAll('input')).find((input) => input.placeholder === 'BIENVENIDA10') as HTMLInputElement | undefined
    expect(couponInput).toBeTruthy()
    await setInputElementValue(couponInput!, 'bienvenida10')

    const applyButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Aplicar'))
    await clickElement(applyButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cupón BIENVENIDA10 aplicado')
    expect(document.body.textContent).toContain('Promociones activas')
    expect(document.body.textContent).toContain('BIENVENIDA10 · 10% OFF')
    expect(document.body.textContent).toContain('Descuento (BIENVENIDA10)')
    expect(document.body.textContent).toContain('Total final')
    expect(document.body.textContent).toContain('$ 135,00')

    await cleanup()
  })

  it('shows invalid coupon feedback without breaking the ecosystem checkout', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': {
        body: {
          id: 'eco-1',
          slug: 'demo-ecosystem',
          name: 'Demo Ecosystem',
          promotions: [
            {
              code: 'VENCIDO',
              type: 'PERCENTAGE',
              value: 10,
              shortLabel: 'VENCIDO · 10% OFF',
              expirationDate: '2026-12-31T23:59:59Z'
            }
          ]
        }
      },
      '/api/ecosystem/checkout/preview': {
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

    const { cleanup } = await renderAppAt('/ecosystem/checkout')
    await flush()
    await flush()

    const couponInput = Array.from(document.querySelectorAll('input')).find((input) => input.placeholder === 'BIENVENIDA10') as HTMLInputElement | undefined
    expect(couponInput).toBeTruthy()
    await setInputElementValue(couponInput!, 'vencido')

    const applyButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Aplicar'))
    expect(applyButton).toBeTruthy()
    await clickElement(applyButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('El cupón está vencido.')
    expect(document.body.textContent).toContain('No válido')
    expect(window.location.pathname).toBe('/ecosystem/checkout')

    await cleanup()
  })
})
