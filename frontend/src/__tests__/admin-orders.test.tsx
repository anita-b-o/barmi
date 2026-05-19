import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setInputElementValue, setSelectElementValue } from '../test-utils/testUtils'
import type { StoreAdminOrderDetail } from '@/api/contracts/v1/store'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
    ecosystems: [{ ecosystemId: 'e1', ecosystemSlug: 'demo-eco', role: 'ECOSYSTEM_ADMIN', status: 'ACTIVE' }]
  }
}

const storeOrdersPage = {
  totalElements: 4,
  totalPages: 1,
  page: 0,
  size: 10,
  content: [
    {
      orderId: 'store-1',
      status: 'PAID',
      createdAt: '2026-03-10T12:00:00.000Z',
      totalAmount: 1000,
      currency: 'ARS',
      operationalIssue: null,
      hasFulfillment: false,
      paymentConfirmed: true,
      manuallyCancelled: false,
      canCancel: true,
      canRetryProcessing: false
    },
    {
      orderId: 'store-2',
      status: 'PENDING_PAYMENT',
      createdAt: '2026-03-10T13:00:00.000Z',
      totalAmount: 500,
      currency: 'ARS',
      operationalIssue: {
        code: 'STOCK_CONFLICT',
        title: 'Conflicto de stock post-pago',
        message: 'Pago confirmado con conflicto operativo de stock pendiente de revisión.',
        detectedAt: null,
        items: []
      },
      hasFulfillment: false,
      paymentConfirmed: true,
      manuallyCancelled: false,
      canCancel: true,
      canRetryProcessing: true
    },
    {
      orderId: 'store-3',
      status: 'PAID',
      createdAt: '2026-03-10T14:00:00.000Z',
      totalAmount: 1200,
      currency: 'ARS',
      operationalIssue: null,
      hasFulfillment: true,
      paymentConfirmed: true,
      manuallyCancelled: false,
      canCancel: false,
      canRetryProcessing: false
    },
    {
      orderId: 'store-4',
      status: 'CANCELLED',
      createdAt: '2026-03-10T15:00:00.000Z',
      totalAmount: 800,
      currency: 'ARS',
      operationalIssue: null,
      hasFulfillment: false,
      paymentConfirmed: true,
      manuallyCancelled: true,
      canCancel: false,
      canRetryProcessing: false
    }
  ]
}

const storeOrder1: StoreAdminOrderDetail = {
  orderId: 'store-1',
  status: 'PAID',
  createdAt: '2026-03-10T12:00:00.000Z',
  currency: 'ARS',
  subtotalAmount: 800,
  originalAmount: 800,
  discountAmount: 0,
  appliedCouponCode: null,
  shippingCostAmount: 200,
  totalAmount: 1000,
  items: [
    { productId: 'p1', name: 'Producto 1', qty: 1, unitPriceAmount: 800, lineTotalAmount: 800, currency: 'ARS' }
  ],
  shipping: { zoneId: 'zone-1', postalCode: '1900' },
  payment: null,
  fulfillment: null,
  operationalIssue: null,
  operationalSummary: {
    status: 'PAID',
    paymentConfirmed: false,
    hasOperationalConflict: false,
    hasFulfillment: false,
    manuallyCancelled: false,
    canCancel: true,
    canRetryProcessing: false
  },
  timeline: [
    { code: 'ORDER_CREATED', title: 'Orden creada', description: 'La orden STORE quedó registrada en backend.', occurredAt: '2026-03-10T12:00:00.000Z' }
  ]
}

const storeOrder2: StoreAdminOrderDetail = {
  orderId: 'store-2',
  status: 'PENDING_PAYMENT',
  createdAt: '2026-03-10T13:00:00.000Z',
  currency: 'ARS',
  subtotalAmount: 400,
  originalAmount: 400,
  discountAmount: 0,
  appliedCouponCode: null,
  shippingCostAmount: 100,
  totalAmount: 500,
  items: [
    { productId: 'p2', name: 'Producto 2', qty: 1, unitPriceAmount: 400, lineTotalAmount: 400, currency: 'ARS' }
  ],
  shipping: { zoneId: 'zone-2', postalCode: '1901' },
  payment: {
    status: 'CONFIRMED',
    provider: 'MERCADOPAGO',
    providerPaymentId: 'mp-store-2',
    confirmedAt: '2026-03-10T13:05:00.000Z'
  },
  fulfillment: null,
  operationalIssue: {
    code: 'STOCK_CONFLICT',
    title: 'Conflicto de stock post-pago',
    message: 'El pago fue confirmado, pero no se pudo completar la orden porque el stock ya no alcanzaba al momento del procesamiento.',
    detectedAt: '2026-03-10T13:06:00.000Z',
    items: [
      { productId: 'p2', sku: 'SKU-2', availableQuantity: 0, requestedQuantity: 1 }
    ]
  },
  operationalSummary: {
    status: 'PENDING_PAYMENT',
    paymentConfirmed: true,
    hasOperationalConflict: true,
    hasFulfillment: false,
    manuallyCancelled: false,
    canCancel: true,
    canRetryProcessing: true
  },
  timeline: [
    { code: 'ORDER_CREATED', title: 'Orden creada', description: 'La orden STORE quedó registrada en backend.', occurredAt: '2026-03-10T13:00:00.000Z' },
    { code: 'PAYMENT_INITIATED', title: 'Pago iniciado', description: 'Se abrió una intención de pago para la orden.', occurredAt: '2026-03-10T13:04:00.000Z' },
    { code: 'PAYMENT_CONFIRMED', title: 'Pago confirmado', description: 'El proveedor confirmó el pago.', occurredAt: '2026-03-10T13:05:00.000Z' },
    { code: 'STOCK_CONFLICT', title: 'Conflicto de stock', description: 'El pago ya estaba confirmado, pero no había stock suficiente para completar la orden.', occurredAt: '2026-03-10T13:06:00.000Z' }
  ]
}

function getDetailOrderCalls(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls.filter(([url]) => {
    const value = String(url)
    return value.includes('/api/store/admin/orders/') && !value.includes('/fulfillment')
  })
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
  mockFetch({
    '/api/auth/me': { body: authMe },
    '/api/store/admin/orders': (url) => {
      const parsed = new URL(url, 'http://localhost')
      const status = parsed.searchParams.get('status')
      const operationalConflict = parsed.searchParams.get('hasOperationalConflict')
      const hasFulfillment = parsed.searchParams.get('hasFulfillment')
      let content = storeOrdersPage.content
      if (status) content = content.filter((order) => order.status === status)
      if (operationalConflict === 'true') content = content.filter((order) => Boolean(order.operationalIssue))
      if (operationalConflict === 'false') content = content.filter((order) => !order.operationalIssue)
      if (hasFulfillment === 'true') content = content.filter((order) => order.hasFulfillment)
      if (hasFulfillment === 'false') content = content.filter((order) => !order.hasFulfillment)
      return { body: { ...storeOrdersPage, totalElements: content.length, totalPages: content.length === 0 ? 0 : 1, content } }
    },
    '/api/store/admin/orders/store-1': { body: storeOrder1 },
    '/api/store/admin/orders/store-2': { body: storeOrder2 },
    '/api/store/admin/orders/store-3': {
      body: {
        ...storeOrder1,
        orderId: 'store-3',
        timeline: [
          ...storeOrder1.timeline,
          {
            code: 'FULFILLMENT_CREATED',
            title: 'Fulfillment creado',
            description: 'Se creó el fulfillment operativo para esta orden.',
            occurredAt: '2026-03-10T14:10:00.000Z'
          }
        ],
        operationalSummary: {
          status: 'PAID',
          paymentConfirmed: true,
          hasOperationalConflict: false,
          hasFulfillment: true,
          manuallyCancelled: false,
          canCancel: false,
          canRetryProcessing: false
        }
      }
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin orders filters', () => {
  it('renders /admin/orders and applies store filters', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/orders': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const status = parsed.searchParams.get('status')
        const operationalConflict = parsed.searchParams.get('hasOperationalConflict')
        const hasFulfillment = parsed.searchParams.get('hasFulfillment')
        let content = storeOrdersPage.content
        if (status) content = content.filter((order) => order.status === status)
        if (operationalConflict === 'true') content = content.filter((order) => Boolean(order.operationalIssue))
        if (operationalConflict === 'false') content = content.filter((order) => !order.operationalIssue)
        if (hasFulfillment === 'true') content = content.filter((order) => order.hasFulfillment)
        if (hasFulfillment === 'false') content = content.filter((order) => !order.hasFulfillment)
        return { body: { ...storeOrdersPage, totalElements: content.length, totalPages: content.length === 0 ? 0 : 1, content } }
      },
      '/api/store/admin/orders/store-1': { body: storeOrder1 },
      '/api/store/admin/orders/store-2': { body: storeOrder2 }
    })

    const { cleanup } = await renderAppAt('/admin/orders')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Órdenes STORE')
    expect(document.body.textContent).toContain('totalAmount')
    expect(document.body.textContent).toContain('currency')
    expect(document.body.textContent).toContain('STOCK_CONFLICT')
    expect(document.body.textContent).toContain('Pago confirmado')
    expect(document.body.textContent).toContain('Fulfillment creado')
    expect(document.body.textContent).toContain('Cancelada manualmente')
    expect(getDetailOrderCalls(handler)).toHaveLength(0)

    const statusSelect = Array.from(document.querySelectorAll('select'))[0]
    expect(statusSelect).toBeTruthy()

    await setSelectElementValue(statusSelect as HTMLSelectElement, 'PAID')
    await flush()
    await flush()

    const detailLinks = Array.from(document.querySelectorAll('a'))
      .filter((a) => a.textContent?.includes('Ver detalle'))
    expect(detailLinks.length).toBe(2)
    expect(document.body.textContent).toContain('store-1')
    expect(document.body.textContent).toContain('store-3')
    expect(document.body.textContent).not.toContain('STOCK_CONFLICT')
    expect(getDetailOrderCalls(handler)).toHaveLength(0)

    await cleanup()
  })

  it('shows contextual empty state when filters exclude results', async () => {
    const { cleanup } = await renderAppAt('/admin/orders')
    await flush()
    await flush()

    const statusSelect = Array.from(document.querySelectorAll('select'))[0]
    await setSelectElementValue(statusSelect as HTMLSelectElement, 'CANCELLED')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('store-4')
    expect(document.body.textContent).toContain('Cancelada manualmente')

    await cleanup()
  })

  it('filters by operational conflict and fulfillment indicators', async () => {
    const { cleanup } = await renderAppAt('/admin/orders')
    await flush()
    await flush()

    const selects = Array.from(document.querySelectorAll('select'))
    const conflictSelect = selects[1]
    const fulfillmentSelect = selects[2]

    await setSelectElementValue(conflictSelect as HTMLSelectElement, 'YES')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('store-2')
    expect(document.body.textContent).not.toContain('store-1')
    expect(document.body.textContent).toContain('STOCK_CONFLICT')

    await setSelectElementValue(conflictSelect as HTMLSelectElement, 'ALL')
    await setSelectElementValue(fulfillmentSelect as HTMLSelectElement, 'YES')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('store-3')
    expect(document.body.textContent).not.toContain('store-2')
    expect(document.body.textContent).toContain('Fulfillment creado')

    await cleanup()
  })

  it('clears filters with the clear button', async () => {
    const { cleanup } = await renderAppAt('/admin/orders')
    await flush()
    await flush()

    const statusSelect = Array.from(document.querySelectorAll('select'))[0]
    const queryInput = document.querySelector('input') as HTMLInputElement

    await setSelectElementValue(statusSelect as HTMLSelectElement, 'PAID')
    await setInputElementValue(queryInput, 'store-1')
    await flush()
    await flush()

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Limpiar filtros'))
    expect(clearButton).toBeTruthy()
    await clickElement(clearButton)
    await flush()

    expect(statusSelect.value).toBe('ALL')
    expect((Array.from(document.querySelectorAll('select'))[1] as HTMLSelectElement).value).toBe('ALL')
    expect((Array.from(document.querySelectorAll('select'))[2] as HTMLSelectElement).value).toBe('ALL')
    expect(queryInput.value).toBe('')

    await cleanup()
  })

  it('shows drill-down context and sends reporting filters to the orders list endpoint', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/orders': {
        body: {
          totalElements: 1,
          totalPages: 1,
          page: 0,
          size: 10,
          content: [storeOrdersPage.content[1]]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/orders?drilldownMetric=ordersPaid&rangeLabel=Ultimos+7+dias&paidFrom=2026-03-12T00:00:00.000Z&paidTo=2026-03-19T00:00:00.000Z')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Drill-down operativo activo')
    expect(document.body.textContent).toContain('Órdenes pagadas')
    expect(document.body.textContent).toContain('Ultimos 7 dias')

    const listCall = handler.mock.calls.find(([url]) => String(url).includes('/api/store/admin/orders?'))
    expect(String(listCall?.[0])).toContain('paidFrom=2026-03-12T00%3A00%3A00.000Z')
    expect(String(listCall?.[0])).toContain('paidTo=2026-03-19T00%3A00%3A00.000Z')

    await cleanup()
  })

  it('accepts the new paymentsConfirmed drill-down alias', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/orders': {
        body: {
          totalElements: 1,
          totalPages: 1,
          page: 0,
          size: 10,
          content: [storeOrdersPage.content[1]]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/orders?drilldownMetric=paymentsConfirmed&rangeLabel=Ultimos+7+dias&paidFrom=2026-03-12T00:00:00.000Z&paidTo=2026-03-19T00:00:00.000Z')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Pagos confirmados')
    expect(document.body.textContent).toContain('Ultimos 7 dias')

    await cleanup()
  })

  it('navigates to /admin/orders/:orderId and renders detail', async () => {
    const { cleanup } = await renderAppAt('/admin/orders/store-1')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Detalle de orden STORE')
    expect(document.body.textContent).toContain('store-1')
    expect(document.body.textContent).toContain('Crear fulfillment')
    expect(document.body.textContent).toContain('Resumen operativo')
    expect(document.body.textContent).toContain('Pago confirmado: No')
    expect(document.body.textContent).toContain('Timeline operativo')
    expect(document.body.textContent).toContain('shippingZoneId')
    expect(document.body.textContent).toContain('Producto 1')

    await cleanup()
  })

  it('creates fulfillment from a paid order and navigates to its detail', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/orders/store-1': { body: storeOrder1 },
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

    await clickElement(createButton)
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

    expect(document.body.textContent).toContain('Conflicto de stock post-pago')
    expect(document.body.textContent).toContain('La orden tiene un conflicto operativo post-pago.')
    expect(document.body.textContent).toContain('SKU-2')
    expect(document.body.textContent).toContain('Pago confirmado: Sí')
    expect(document.body.textContent).toContain('Conflicto operativo: Sí')
    expect(document.body.textContent).toContain('Reintentar procesamiento')
    expect(document.body.textContent).toContain('Cancelar orden')
    expect(document.body.textContent).toContain('Pago confirmado')
    expect(document.body.textContent).not.toContain('Crear fulfillment')

    await cleanup()
  })

  it('cancels a store order from admin detail', async () => {
    let currentOrder: StoreAdminOrderDetail = { ...storeOrder2 }

    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/orders/store-2': () => ({ body: currentOrder }),
      '/api/store/admin/orders/store-2/cancel': () => {
        currentOrder = {
          ...currentOrder,
          status: 'CANCELLED',
          operationalIssue: null,
          operationalSummary: {
            ...currentOrder.operationalSummary,
            status: 'CANCELLED',
            hasOperationalConflict: false,
            manuallyCancelled: true,
            canCancel: false,
            canRetryProcessing: false
          },
          timeline: [
            ...currentOrder.timeline,
            {
              code: 'MANUAL_CANCELLATION',
              title: 'Cancelación manual',
              description: 'Un admin canceló manualmente la orden.',
              occurredAt: '2026-03-10T13:10:00.000Z'
            }
          ]
        }
        return {
          body: currentOrder
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/orders/store-2')
    await flush()
    await flush()

    const cancelButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Cancelar orden'))
    expect(cancelButton).toBeTruthy()

    await clickElement(cancelButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('CANCELLED')
    expect(document.body.textContent).toContain('Cancelación manual')
    expect(document.body.textContent).not.toContain('Reintentar procesamiento')
    expect(document.body.textContent).toContain('Cancelada manualmente: Sí')

    await cleanup()
  })

  it('retries conflicted store order processing from admin detail', async () => {
    let currentOrder: StoreAdminOrderDetail = { ...storeOrder2 }
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/orders/store-2': () => ({ body: currentOrder }),
      '/api/store/admin/orders/store-2/retry-processing': {
        body: {
          status: 'PAID',
          resolved: true,
          stillConflicted: false,
          fulfillmentId: 'f-retry'
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/orders/store-2')
    await flush()
    await flush()

    const retryButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Reintentar procesamiento'))
    expect(retryButton).toBeTruthy()

    currentOrder = {
      ...currentOrder,
      status: 'PAID',
      operationalIssue: null,
      operationalSummary: {
        ...currentOrder.operationalSummary,
        status: 'PAID',
        hasOperationalConflict: false,
        hasFulfillment: true,
        canCancel: false,
        canRetryProcessing: false
      },
      timeline: [
        ...currentOrder.timeline,
        {
          code: 'ORDER_PAID',
          title: 'Orden marcada como pagada',
          description: 'La orden terminó su procesamiento y quedó operativamente pagada.',
          occurredAt: '2026-03-10T13:11:00.000Z'
        },
        {
          code: 'FULFILLMENT_CREATED',
          title: 'Fulfillment creado',
          description: 'Se creó el fulfillment operativo para esta orden.',
          occurredAt: '2026-03-10T13:12:00.000Z'
        }
      ]
    }

    await clickElement(retryButton)
    await flush()
    await flush()

    const retryCall = handler.mock.calls.find((call) => {
      const init = call[1] as RequestInit | undefined
      return String(call[0]).includes('/api/store/admin/orders/store-2/retry-processing') && init?.method === 'POST'
    })
    expect(retryCall).toBeTruthy()
    expect(document.body.textContent).toContain('Fulfillment creado')
    expect(document.body.textContent).not.toContain('Reintentar procesamiento')
    expect(document.body.textContent).not.toContain('Crear fulfillment')
    expect(document.body.textContent).toContain('Fulfillment creado: Sí')

    await cleanup()
  })

  it('hides manual actions when the order already has fulfillment', async () => {
    const { cleanup } = await renderAppAt('/admin/orders/store-3')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Fulfillment creado: Sí')
    expect(document.body.textContent).toContain('Las acciones manuales sobre la orden quedan cerradas.')
    expect(document.body.textContent).not.toContain('Cancelar orden')
    expect(document.body.textContent).not.toContain('Reintentar procesamiento')
    expect(document.body.textContent).not.toContain('Crear fulfillment')

    await cleanup()
  })

  it('shows backend errors when fulfillment creation fails', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/admin/orders/store-1': { body: storeOrder1 },
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
    await clickElement(createButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Ya existe un fulfillment para esta orden.')
    expect(window.location.pathname).toBe('/admin/orders/store-1')

    await cleanup()
  })
})
