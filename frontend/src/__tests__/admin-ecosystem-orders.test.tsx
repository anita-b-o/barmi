import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

const ecosystemMembershipProfile = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [],
    ecosystems: [{ ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' }]
  }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin ecosystem orders', () => {
  it('renders the admin ecosystem orders list', async () => {
    mockFetch({
      '/api/auth/me': { body: ecosystemMembershipProfile },
      '/api/ecosystem/orders?page=0&size=20': {
        body: {
          totalElements: 1,
          totalPages: 1,
          page: 0,
          size: 20,
          content: [
            {
              orderId: 'eco-order-1',
              status: 'PENDING_PAYMENT',
              createdAt: '2026-03-10T12:00:00.000Z',
              totalAmount: 150,
              currency: 'ARS'
            }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/orders')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Órdenes Ecosystem')
    expect(document.body.textContent).toContain('eco-order-1')
    expect(document.body.textContent).toContain('PENDING_PAYMENT')

    const detailLink = Array.from(document.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Seguir pago'))
    expect(detailLink?.getAttribute('href')).toBe('/admin/ecosystem/orders/eco-order-1')

    await cleanup()
  })

  it('loads the admin ecosystem order detail and reuses payment retry', async () => {
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)

    mockFetch({
      '/api/auth/me': { body: ecosystemMembershipProfile },
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
          shipping: {
            zoneId: 'zone-1',
            postalCode: '1900'
          },
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
          checkoutUrl: 'https://checkout.mercadopago.example/admin-eco',
          provider: 'MERCADOPAGO',
          providerPreferenceId: 'eco-pref-1'
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/orders/eco-order-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Detalle de orden Ecosystem')
    expect(document.body.textContent).toContain('External Apple')
    expect(document.body.textContent).toContain('1900')
    expect(document.body.textContent).toContain('Reintentar pago')

    const payButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Reintentar pago'))
    payButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(openSpy).toHaveBeenCalledWith('https://checkout.mercadopago.example/admin-eco', '_self')

    await cleanup()
  })

  it('shows retry on list errors and recovers on retry', async () => {
    let calls = 0

    mockFetch({
      '/api/auth/me': { body: ecosystemMembershipProfile },
      '/api/ecosystem/orders?page=0&size=20&status=PAID': () => {
        calls += 1
        if (calls === 1) {
          return {
            status: 500,
            body: {
              error: {
                code: 'http_error',
                message: 'No se pudieron cargar las órdenes',
                status: 500
              }
            }
          }
        }

        return {
          body: {
            totalElements: 1,
            totalPages: 1,
            page: 0,
            size: 20,
            content: [
              {
                orderId: 'eco-order-2',
                status: 'PAID',
                createdAt: '2026-03-11T12:00:00.000Z',
                totalAmount: 220,
                currency: 'ARS'
              }
            ]
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/orders?status=PAID')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No se pudieron cargar las órdenes')

    const retryButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Reintentar'))
    retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(calls).toBe(2)
    expect(document.body.textContent).toContain('eco-order-2')

    await cleanup()
  })

  it('shows drill-down context and sends reporting filters to the ecosystem orders endpoint', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: ecosystemMembershipProfile },
      '/api/ecosystem/orders?page=0&size=20&ecosystemId=eco-1&paidFrom=2026-03-12T00%3A00%3A00.000Z&paidTo=2026-03-19T00%3A00%3A00.000Z': {
        body: {
          totalElements: 1,
          totalPages: 1,
          page: 0,
          size: 20,
          content: [
            {
              orderId: 'eco-order-paid',
              status: 'PAID',
              createdAt: '2026-03-13T12:00:00.000Z',
              totalAmount: 220,
              currency: 'ARS',
              paidAt: '2026-03-13T12:01:00.000Z'
            }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/orders?ecosystemId=eco-1&drilldownMetric=paymentsConfirmed&rangeLabel=Ultimos+7+dias&paidFrom=2026-03-12T00:00:00.000Z&paidTo=2026-03-19T00:00:00.000Z')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Drill-down operativo activo')
    expect(document.body.textContent).toContain('Pagos confirmados')
    expect(document.body.textContent).toContain('eco-order-paid')
    expect(handler.mock.calls.some(([url]) => String(url).includes('paidFrom=2026-03-12T00%3A00%3A00.000Z'))).toBe(true)

    await cleanup()
  })
})
