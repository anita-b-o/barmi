import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
    ecosystems: [{ ecosystemId: 'e1', ecosystemSlug: 'demo-eco', role: 'ECOSYSTEM_ADMIN', status: 'ACTIVE' }]
  }
}

const storeOrdersPage = {
  totalElements: 2,
  totalPages: 1,
  page: 0,
  size: 10,
  content: [
    { orderId: 'store-1', status: 'PAID', createdAt: '2026-03-10T12:00:00.000Z', totalAmount: 1000, currency: 'ARS' },
    { orderId: 'store-2', status: 'PENDING_PAYMENT', createdAt: '2026-03-10T13:00:00.000Z', totalAmount: 500, currency: 'ARS' }
  ]
}

const storeOrder1 = {
  orderId: 'store-1',
  status: 'PAID',
  createdAt: '2026-03-10T12:00:00.000Z',
  currency: 'ARS',
  subtotalAmount: 800,
  shippingCostAmount: 200,
  totalAmount: 1000,
  items: [
    { productId: 'p1', name: 'Producto 1', qty: 1, unitPriceAmount: 800, lineTotalAmount: 800, currency: 'ARS' }
  ],
  shipping: { zoneId: 'zone-1', postalCode: '1900' },
  payment: null
}

const storeOrder2 = {
  orderId: 'store-2',
  status: 'PENDING_PAYMENT',
  createdAt: '2026-03-10T13:00:00.000Z',
  currency: 'ARS',
  subtotalAmount: 400,
  shippingCostAmount: 100,
  totalAmount: 500,
  items: [
    { productId: 'p2', name: 'Producto 2', qty: 1, unitPriceAmount: 400, lineTotalAmount: 400, currency: 'ARS' }
  ],
  shipping: { zoneId: 'zone-2', postalCode: '1901' },
  payment: null
}

function getDetailOrderCalls(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls.filter(([url]) => {
    const value = String(url)
    return value.includes('/api/store/orders/') && !value.includes('/fulfillment')
  })
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
  mockFetch({
    '/api/auth/me': { body: authMe },
    '/api/store/orders': (url) => {
      const parsed = new URL(url, 'http://localhost')
      const status = parsed.searchParams.get('status')
      if (status === 'PAID') {
        return {
          body: {
            ...storeOrdersPage,
            totalElements: 1,
            totalPages: 1,
            content: [storeOrdersPage.content[0]]
          }
        }
      }
      if (status === 'CANCELLED') {
        return {
          body: {
            ...storeOrdersPage,
            totalElements: 0,
            totalPages: 0,
            content: []
          }
        }
      }
      return { body: storeOrdersPage }
    },
    '/api/store/orders/store-1': { body: storeOrder1 },
    '/api/store/orders/store-2': { body: storeOrder2 }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin orders filters', () => {
  it('renders /admin/orders and applies store filters', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/orders': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const status = parsed.searchParams.get('status')
        if (status === 'PAID') {
          return {
            body: {
              ...storeOrdersPage,
              totalElements: 1,
              totalPages: 1,
              content: [storeOrdersPage.content[0]]
            }
          }
        }
        if (status === 'CANCELLED') {
          return {
            body: {
              ...storeOrdersPage,
              totalElements: 0,
              totalPages: 0,
              content: []
            }
          }
        }
        return { body: storeOrdersPage }
      },
      '/api/store/orders/store-1': { body: storeOrder1 },
      '/api/store/orders/store-2': { body: storeOrder2 }
    })

    const { cleanup } = await renderAppAt('/admin/orders')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Órdenes STORE')
    expect(document.body.textContent).toContain('totalAmount')
    expect(document.body.textContent).toContain('currency')
    expect(document.body.textContent).not.toContain('subtotalAmount')
    expect(document.body.textContent).not.toContain('shippingCostAmount')
    expect(getDetailOrderCalls(handler)).toHaveLength(0)

    const statusSelect = Array.from(document.querySelectorAll('select'))[0]
    expect(statusSelect).toBeTruthy()

    statusSelect.value = 'PAID'
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await flush()
    await flush()

    const detailLinks = Array.from(document.querySelectorAll('a'))
      .filter((a) => a.textContent?.includes('Ver detalle'))
    expect(detailLinks.length).toBe(1)
    expect(document.body.textContent).toContain('store-1')
    expect(getDetailOrderCalls(handler)).toHaveLength(0)

    await cleanup()
  })

  it('shows contextual empty state when filters exclude results', async () => {
    const { cleanup } = await renderAppAt('/admin/orders')
    await flush()
    await flush()

    const statusSelect = Array.from(document.querySelectorAll('select'))[0]
    statusSelect.value = 'CANCELLED'
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No hay órdenes que coincidan con los filtros')
    expect(document.body.textContent).toContain('Probá cambiando estado o búsqueda.')

    await cleanup()
  })

  it('clears filters with the clear button', async () => {
    const { cleanup } = await renderAppAt('/admin/orders')
    await flush()
    await flush()

    const statusSelect = Array.from(document.querySelectorAll('select'))[0]
    const queryInput = document.querySelector('input') as HTMLInputElement

    statusSelect.value = 'PAID'
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
    queryInput.value = 'store-1'
    queryInput.dispatchEvent(new Event('change', { bubbles: true }))
    await flush()
    await flush()

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Limpiar filtros'))
    expect(clearButton).toBeTruthy()
    clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(statusSelect.value).toBe('ALL')
    expect(queryInput.value).toBe('')

    await cleanup()
  })

  it('navigates to /admin/orders/:orderId and renders detail', async () => {
    const { cleanup } = await renderAppAt('/admin/orders/store-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Detalle de orden STORE')
    expect(document.body.textContent).toContain('store-1')
    expect(document.body.textContent).toContain('Crear fulfillment')
    expect(document.body.textContent).toContain('shippingZoneId')
    expect(document.body.textContent).toContain('Producto 1')

    await cleanup()
  })

  it('creates fulfillment from a paid order and navigates to its detail', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/orders/store-1': { body: storeOrder1 },
      '/api/store/orders/store-1/fulfillment': {
        body: {
          fulfillmentId: 'f-created',
          storeOrderId: 'store-1',
          storeId: 's1',
          status: 'PENDING',
          method: 'DELIVERY',
          createdAt: '2026-03-10T12:10:00.000Z'
        }
      },
      '/api/store/fulfillments/f-created': {
        body: {
          fulfillmentId: 'f-created',
          storeOrderId: 'store-1',
          storeId: 's1',
          status: 'PENDING',
          method: 'DELIVERY',
          createdAt: '2026-03-10T12:10:00.000Z'
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/orders/store-1')
    await flush()
    await flush()

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear fulfillment'))
    expect(createButton).toBeTruthy()

    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    const postCall = handler.mock.calls.find((call) => {
      const init = call[1] as RequestInit | undefined
      return String(call[0]).includes('/api/store/orders/store-1/fulfillment') && init?.method === 'POST'
    })
    expect(postCall).toBeTruthy()
    expect(window.location.pathname).toBe('/admin/fulfillments/f-created')
    expect(document.body.textContent).toContain('Detalle de fulfillment STORE')
    expect(document.body.textContent).toContain('f-created')

    await cleanup()
  })

  it('does not render create fulfillment CTA for non-operable orders', async () => {
    const { cleanup } = await renderAppAt('/admin/orders/store-2')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('La orden todavía no admite fulfillment porque sigue pendiente de pago.')
    expect(document.body.textContent).not.toContain('Crear fulfillment')

    await cleanup()
  })

  it('shows backend errors when fulfillment creation fails', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/orders/store-1': { body: storeOrder1 },
      '/api/store/orders/store-1/fulfillment': {
        status: 409,
        body: {
          error: {
            code: 'fulfillment_already_exists',
            message: 'Ya existe un fulfillment para esta orden.',
            status: 409
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/orders/store-1')
    await flush()
    await flush()

    const createButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear fulfillment'))
    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Ya existe un fulfillment para esta orden.')
    expect(window.location.pathname).toBe('/admin/orders/store-1')

    await cleanup()
  })
})
