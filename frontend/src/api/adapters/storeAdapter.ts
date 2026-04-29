import { requestJson, requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import {
  StoreAdminOrderOperationalSummary,
  StoreAdminOrdersPage,
  StoreAdminOrderSummary,
  StoreCheckoutPreviewRes,
  StoreCheckoutReq,
  StoreCheckoutRes,
  StoreAdminOrderDetail,
  StoreOrderDetail,
  StoreOrderFulfillment,
  StoreOrderItem,
  StoreOrderOperationalIssue,
  StoreOrderOperationalIssueItem,
  StoreOrderPayment,
  StoreOrderShipping,
  StoreOrderRetryProcessingResult,
  StoreOrderTimelineEvent,
  StoreOrdersPage,
  StoreOrderStatus,
  StoreOrderSummary,
  StoreShippingQuoteRes
} from '../contracts/v1/store'
import { assertArray, assertLiteral, assertNumber, assertRecord, assertString } from './validators'

function assertStoreStatus(value: unknown, message: string): asserts value is StoreOrderStatus {
  assertString(value, message)
  if (value === 'PENDING_PAYMENT' || value === 'PAID' || value === 'CANCELLED') return
  throw new Error(message)
}

function parseOrderSummary(data: unknown, index: number): StoreOrderSummary {
  assertRecord(data, `Order summary at ${index} is invalid`)
  assertString(data.orderId, `Order summary orderId at ${index} is required`)
  assertStoreStatus(data.status, `Order summary status at ${index} is required`)
  assertString(data.createdAt, `Order summary createdAt at ${index} is required`)
  assertNumber(data.totalAmount, `Order summary totalAmount at ${index} is required`)
  assertString(data.currency, `Order summary currency at ${index} is required`)
  return {
    orderId: data.orderId,
    status: data.status,
    createdAt: data.createdAt,
    totalAmount: data.totalAmount,
    currency: data.currency,
    operationalIssue: parseOperationalIssue(data.operationalIssue)
  }
}

function parseAdminOrderSummary(data: unknown, index: number): StoreAdminOrderSummary {
  assertRecord(data, `Admin order summary at ${index} is invalid`)
  assertString(data.orderId, `Admin order summary orderId at ${index} is required`)
  assertStoreStatus(data.status, `Admin order summary status at ${index} is required`)
  assertString(data.createdAt, `Admin order summary createdAt at ${index} is required`)
  assertNumber(data.totalAmount, `Admin order summary totalAmount at ${index} is required`)
  assertString(data.currency, `Admin order summary currency at ${index} is required`)
  if (typeof data.hasFulfillment !== 'boolean') throw new Error(`Admin order summary hasFulfillment at ${index} is required`)
  if (typeof data.paymentConfirmed !== 'boolean') throw new Error(`Admin order summary paymentConfirmed at ${index} is required`)
  if (typeof data.manuallyCancelled !== 'boolean') throw new Error(`Admin order summary manuallyCancelled at ${index} is required`)
  if (typeof data.canCancel !== 'boolean') throw new Error(`Admin order summary canCancel at ${index} is required`)
  if (typeof data.canRetryProcessing !== 'boolean') throw new Error(`Admin order summary canRetryProcessing at ${index} is required`)
  return {
    orderId: data.orderId,
    status: data.status,
    createdAt: data.createdAt,
    totalAmount: data.totalAmount,
    currency: data.currency,
    operationalIssue: parseOperationalIssue(data.operationalIssue),
    hasFulfillment: data.hasFulfillment,
    paymentConfirmed: data.paymentConfirmed,
    manuallyCancelled: data.manuallyCancelled,
    canCancel: data.canCancel,
    canRetryProcessing: data.canRetryProcessing
  }
}

function parseStoreCheckoutTotals(data: Record<string, unknown>, messagePrefix: string): StoreCheckoutPreviewRes {
  assertNumber(data.totalAmount, `${messagePrefix} totalAmount is required`)
  assertNumber(data.originalAmount, `${messagePrefix} originalAmount is required`)
  assertNumber(data.discountAmount, `${messagePrefix} discountAmount is required`)
  if (!(data.appliedCouponCode === null || data.appliedCouponCode === undefined || typeof data.appliedCouponCode === 'string')) {
    throw new Error(`${messagePrefix} appliedCouponCode is invalid`)
  }
  if (!(data.shippingZoneId === null || data.shippingZoneId === undefined || typeof data.shippingZoneId === 'string')) {
    throw new Error(`${messagePrefix} shippingZoneId is invalid`)
  }
  if (!(data.shippingPostalCode === null || data.shippingPostalCode === undefined || typeof data.shippingPostalCode === 'string')) {
    throw new Error(`${messagePrefix} shippingPostalCode is invalid`)
  }
  assertString(data.shippingCurrency, `${messagePrefix} shippingCurrency is required`)
  assertNumber(data.shippingCostAmount, `${messagePrefix} shippingCostAmount is required`)
  assertString(data.currency, `${messagePrefix} currency is required`)
  assertNumber(data.subtotalAmount, `${messagePrefix} subtotalAmount is required`)
  return {
    totalAmount: data.totalAmount,
    originalAmount: data.originalAmount,
    discountAmount: data.discountAmount,
    appliedCouponCode: data.appliedCouponCode ?? null,
    shippingZoneId: data.shippingZoneId ?? null,
    shippingCurrency: data.shippingCurrency,
    shippingCostAmount: data.shippingCostAmount,
    shippingPostalCode: data.shippingPostalCode ?? null,
    currency: data.currency,
    subtotalAmount: data.subtotalAmount
  }
}

export function parseStoreCheckoutRes(data: unknown): StoreCheckoutRes {
  assertRecord(data, 'Invalid checkout response payload')
  const totals = parseStoreCheckoutTotals(data, 'Checkout')
  assertString(data.createdAt, 'Checkout createdAt is required')
  assertString(data.orderId, 'Checkout orderId is required')
  assertStoreStatus(data.status, 'Checkout status is required')
  return {
    ...totals,
    createdAt: data.createdAt,
    orderId: data.orderId,
    status: data.status
  }
}

export function parseStoreCheckoutPreview(data: unknown): StoreCheckoutPreviewRes {
  assertRecord(data, 'Invalid checkout preview payload')
  return parseStoreCheckoutTotals(data, 'Checkout preview')
}

export function parseStoreShippingQuote(data: unknown): StoreShippingQuoteRes {
  assertRecord(data, 'Invalid shipping quote payload')
  assertString(data.postalCode, 'Shipping quote postalCode is required')
  assertString(data.type, 'Shipping quote type is required')
  assertLiteral(data.type, 'EXACT', 'Shipping quote type must be EXACT')
  assertString(data.zoneId, 'Shipping quote zoneId is required')
  assertNumber(data.costAmount, 'Shipping quote costAmount is required')
  assertString(data.currency, 'Shipping quote currency is required')
  return {
    postalCode: data.postalCode,
    type: data.type,
    zoneId: data.zoneId,
    costAmount: data.costAmount,
    currency: data.currency
  }
}

export function parseStoreOrdersPage(data: unknown): StoreOrdersPage {
  assertRecord(data, 'Invalid orders page payload')
  assertNumber(data.totalElements, 'Orders page totalElements is required')
  assertNumber(data.totalPages, 'Orders page totalPages is required')
  assertNumber(data.page, 'Orders page page is required')
  assertNumber(data.size, 'Orders page size is required')
  assertArray(data.content, 'Orders page content is required')
  const content = data.content.map((item, index) => parseOrderSummary(item, index))
  return {
    totalElements: data.totalElements,
    totalPages: data.totalPages,
    page: data.page,
    size: data.size,
    content
  }
}

export function parseStoreAdminOrdersPage(data: unknown): StoreAdminOrdersPage {
  assertRecord(data, 'Invalid admin orders page payload')
  assertNumber(data.totalElements, 'Admin orders page totalElements is required')
  assertNumber(data.totalPages, 'Admin orders page totalPages is required')
  assertNumber(data.page, 'Admin orders page page is required')
  assertNumber(data.size, 'Admin orders page size is required')
  assertArray(data.content, 'Admin orders page content is required')
  return {
    totalElements: data.totalElements,
    totalPages: data.totalPages,
    page: data.page,
    size: data.size,
    content: data.content.map((item, index) => parseAdminOrderSummary(item, index))
  }
}

function parseOrderItem(data: unknown, index: number): StoreOrderItem {
  assertRecord(data, `Order item at ${index} is invalid`)
  assertString(data.productId, `Order item productId at ${index} is required`)
  assertString(data.name, `Order item name at ${index} is required`)
  assertNumber(data.qty, `Order item qty at ${index} is required`)
  assertNumber(data.unitPriceAmount, `Order item unitPriceAmount at ${index} is required`)
  assertNumber(data.lineTotalAmount, `Order item lineTotalAmount at ${index} is required`)
  assertString(data.currency, `Order item currency at ${index} is required`)
  return {
    productId: data.productId,
    name: data.name,
    qty: data.qty,
    unitPriceAmount: data.unitPriceAmount,
    lineTotalAmount: data.lineTotalAmount,
    currency: data.currency
  }
}

function parseOrderShipping(data: unknown): StoreOrderShipping {
  assertRecord(data, 'Order shipping is invalid')
  assertString(data.zoneId, 'Order shipping zoneId is required')
  assertString(data.postalCode, 'Order shipping postalCode is required')
  return {
    zoneId: data.zoneId,
    postalCode: data.postalCode
  }
}

function parseOrderFulfillment(data: unknown): StoreOrderFulfillment {
  assertRecord(data, 'Order fulfillment is invalid')
  assertString(data.fulfillmentId, 'Order fulfillment fulfillmentId is required')
  assertString(data.status, 'Order fulfillment status is required')
  assertString(data.method, 'Order fulfillment method is required')
  assertString(data.createdAt, 'Order fulfillment createdAt is required')
  return {
    fulfillmentId: data.fulfillmentId,
    status: data.status,
    method: data.method,
    createdAt: data.createdAt
  }
}

export function parseStoreOrderDetail(data: unknown): StoreOrderDetail {
  assertRecord(data, 'Invalid order detail payload')
  assertString(data.orderId, 'Order detail orderId is required')
  assertStoreStatus(data.status, 'Order detail status is required')
  assertString(data.createdAt, 'Order detail createdAt is required')
  assertString(data.currency, 'Order detail currency is required')
  assertNumber(data.subtotalAmount, 'Order detail subtotalAmount is required')
  if (!(data.originalAmount === undefined || typeof data.originalAmount === 'number')) {
    throw new Error('Order detail originalAmount is invalid')
  }
  if (!(data.discountAmount === undefined || typeof data.discountAmount === 'number')) {
    throw new Error('Order detail discountAmount is invalid')
  }
  if (!(data.appliedCouponCode === null || data.appliedCouponCode === undefined || typeof data.appliedCouponCode === 'string')) {
    throw new Error('Order detail appliedCouponCode is invalid')
  }
  assertNumber(data.shippingCostAmount, 'Order detail shippingCostAmount is required')
  assertNumber(data.totalAmount, 'Order detail totalAmount is required')
  assertArray(data.items, 'Order detail items is required')
  const items = data.items.map((item, index) => parseOrderItem(item, index))
  const shipping = data.shipping === null ? null : parseOrderShipping(data.shipping)
  const payment = parseOrderPayment(data.payment)
  const fulfillment = data.fulfillment === null || data.fulfillment === undefined ? null : parseOrderFulfillment(data.fulfillment)
  return {
    orderId: data.orderId,
    status: data.status,
    createdAt: data.createdAt,
    currency: data.currency,
    subtotalAmount: data.subtotalAmount,
    originalAmount: data.originalAmount ?? data.totalAmount,
    discountAmount: data.discountAmount ?? 0,
    appliedCouponCode: data.appliedCouponCode ?? null,
    shippingCostAmount: data.shippingCostAmount,
    totalAmount: data.totalAmount,
    items,
    shipping,
    payment,
    fulfillment,
    operationalIssue: parseOperationalIssue(data.operationalIssue)
  }
}

export function parseStoreAdminOrderDetail(data: unknown): StoreAdminOrderDetail {
  const order = parseStoreOrderDetail(data)
  assertRecord(data, 'Invalid admin order detail payload')
  assertArray(data.timeline, 'Admin order detail timeline is required')
  return {
    ...order,
    operationalSummary: parseAdminOperationalSummary(data.operationalSummary),
    timeline: data.timeline.map((item, index) => parseTimelineEvent(item, index))
  }
}

function parseAdminOperationalSummary(data: unknown): StoreAdminOrderOperationalSummary {
  assertRecord(data, 'Admin order operationalSummary is invalid')
  assertStoreStatus(data.status, 'Admin order operationalSummary status is required')
  if (typeof data.paymentConfirmed !== 'boolean') throw new Error('Admin order operationalSummary paymentConfirmed is required')
  if (typeof data.hasOperationalConflict !== 'boolean') throw new Error('Admin order operationalSummary hasOperationalConflict is required')
  if (typeof data.hasFulfillment !== 'boolean') throw new Error('Admin order operationalSummary hasFulfillment is required')
  if (typeof data.manuallyCancelled !== 'boolean') throw new Error('Admin order operationalSummary manuallyCancelled is required')
  if (typeof data.canCancel !== 'boolean') throw new Error('Admin order operationalSummary canCancel is required')
  if (typeof data.canRetryProcessing !== 'boolean') throw new Error('Admin order operationalSummary canRetryProcessing is required')
  return {
    status: data.status,
    paymentConfirmed: data.paymentConfirmed,
    hasOperationalConflict: data.hasOperationalConflict,
    hasFulfillment: data.hasFulfillment,
    manuallyCancelled: data.manuallyCancelled,
    canCancel: data.canCancel,
    canRetryProcessing: data.canRetryProcessing
  }
}

function parseOperationalIssue(data: unknown): StoreOrderOperationalIssue | null {
  if (data === null || data === undefined) return null
  assertRecord(data, 'Order operationalIssue is invalid')
  assertString(data.code, 'Order operationalIssue code is required')
  assertLiteral(data.code, 'STOCK_CONFLICT', 'Order operationalIssue code must be STOCK_CONFLICT')
  assertString(data.title, 'Order operationalIssue title is required')
  assertString(data.message, 'Order operationalIssue message is required')
  if (!(data.detectedAt === null || typeof data.detectedAt === 'string')) {
    throw new Error('Order operationalIssue detectedAt is invalid')
  }
  assertArray(data.items, 'Order operationalIssue items are required')
  return {
    code: data.code,
    title: data.title,
    message: data.message,
    detectedAt: data.detectedAt ?? null,
    items: data.items.map((item, index) => parseOperationalIssueItem(item, index))
  }
}

function parseOperationalIssueItem(data: unknown, index: number): StoreOrderOperationalIssueItem {
  assertRecord(data, `Order operationalIssue item at ${index} is invalid`)
  if (!(data.productId === null || typeof data.productId === 'string')) {
    throw new Error(`Order operationalIssue item productId at ${index} is invalid`)
  }
  if (!(data.sku === null || typeof data.sku === 'string')) {
    throw new Error(`Order operationalIssue item sku at ${index} is invalid`)
  }
  assertNumber(data.availableQuantity, `Order operationalIssue item availableQuantity at ${index} is required`)
  assertNumber(data.requestedQuantity, `Order operationalIssue item requestedQuantity at ${index} is required`)
  return {
    productId: data.productId ?? null,
    sku: data.sku ?? null,
    availableQuantity: data.availableQuantity,
    requestedQuantity: data.requestedQuantity
  }
}

function parseOrderPayment(data: unknown): StoreOrderPayment | null {
  if (data === null) return null
  assertRecord(data, 'Order payment is invalid')
  assertString(data.status, 'Order payment status is required')
  assertString(data.provider, 'Order payment provider is required')
  assertString(data.providerPaymentId, 'Order payment providerPaymentId is required')
  assertString(data.confirmedAt, 'Order payment confirmedAt is required')
  return {
    status: data.status,
    provider: data.provider,
    providerPaymentId: data.providerPaymentId,
    confirmedAt: data.confirmedAt
  }
}

function parseTimelineEvent(data: unknown, index: number): StoreOrderTimelineEvent {
  assertRecord(data, `Order timeline event at ${index} is invalid`)
  assertString(data.code, `Order timeline event code at ${index} is required`)
  assertString(data.title, `Order timeline event title at ${index} is required`)
  assertString(data.description, `Order timeline event description at ${index} is required`)
  assertString(data.occurredAt, `Order timeline event occurredAt at ${index} is required`)
  return {
    code: data.code,
    title: data.title,
    description: data.description,
    occurredAt: data.occurredAt
  }
}

function parseRetryProcessingResult(data: unknown): StoreOrderRetryProcessingResult {
  assertRecord(data, 'Invalid retry processing payload')
  assertStoreStatus(data.status, 'Retry processing status is required')
  if (typeof data.resolved !== 'boolean') throw new Error('Retry processing resolved is required')
  if (typeof data.stillConflicted !== 'boolean') throw new Error('Retry processing stillConflicted is required')
  if (!(data.fulfillmentId === null || typeof data.fulfillmentId === 'string')) {
    throw new Error('Retry processing fulfillmentId is invalid')
  }
  return {
    status: data.status,
    resolved: data.resolved,
    stillConflicted: data.stillConflicted,
    fulfillmentId: data.fulfillmentId ?? null
  }
}

export const storeAdapter = {
  async getShippingQuote(postalCode: string) {
    const data = await requestJson<unknown>(`/api/store/shipping/quote?postalCode=${encodeURIComponent(postalCode)}`)
    return parseStoreShippingQuote(data)
  },
  async previewCheckout(payload: StoreCheckoutReq) {
    const data = await requestJson<unknown>('/api/store/checkout/preview', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return parseStoreCheckoutPreview(data)
  },
  async checkout(payload: StoreCheckoutReq) {
    const data = await requestJson<unknown>('/api/store/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return parseStoreCheckoutRes(data)
  },
  async listOrders(page = 0, size = 20, options: { status?: StoreOrderStatus; sort?: string } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size)
    })
    if (options.status) params.set('status', options.status)
    if (options.sort) params.set('sort', options.sort)
    const data = await requestJson<unknown>(`/api/store/orders?${params.toString()}`)
    return parseStoreOrdersPage(data)
  },
  async getOrder(orderId: string) {
    const data = await requestJson<unknown>(`/api/store/orders/${orderId}`)
    return parseStoreOrderDetail(data)
  },
  async getAdminOrder(orderId: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(`/api/store/admin/orders/${orderId}`, {}, {}, auth)
    return parseStoreAdminOrderDetail(data)
  },
  async listAdminOrders(
    page = 0,
    size = 20,
    options: {
      status?: StoreOrderStatus
      createdFrom?: string
      createdTo?: string
      paidFrom?: string
      paidTo?: string
      hasOperationalConflict?: boolean
      manuallyCancelled?: boolean
      manualCancelledFrom?: string
      manualCancelledTo?: string
      hasConflictEvent?: boolean
      conflictFrom?: string
      conflictTo?: string
      hasFulfillment?: boolean
      sort?: string
    } = {},
    auth: AuthRequestContext
  ) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size)
    })
    if (options.status) params.set('status', options.status)
    if (options.createdFrom) params.set('createdFrom', options.createdFrom)
    if (options.createdTo) params.set('createdTo', options.createdTo)
    if (options.paidFrom) params.set('paidFrom', options.paidFrom)
    if (options.paidTo) params.set('paidTo', options.paidTo)
    if (typeof options.hasOperationalConflict === 'boolean') {
      params.set('hasOperationalConflict', String(options.hasOperationalConflict))
    }
    if (typeof options.manuallyCancelled === 'boolean') {
      params.set('manuallyCancelled', String(options.manuallyCancelled))
    }
    if (options.manualCancelledFrom) params.set('manualCancelledFrom', options.manualCancelledFrom)
    if (options.manualCancelledTo) params.set('manualCancelledTo', options.manualCancelledTo)
    if (typeof options.hasConflictEvent === 'boolean') {
      params.set('hasConflictEvent', String(options.hasConflictEvent))
    }
    if (options.conflictFrom) params.set('conflictFrom', options.conflictFrom)
    if (options.conflictTo) params.set('conflictTo', options.conflictTo)
    if (typeof options.hasFulfillment === 'boolean') {
      params.set('hasFulfillment', String(options.hasFulfillment))
    }
    if (options.sort) params.set('sort', options.sort)
    const data = await requestJsonWithAuth<unknown>(`/api/store/admin/orders?${params.toString()}`, {}, {}, auth)
    return parseStoreAdminOrdersPage(data)
  },
  async cancelOrder(orderId: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(`/api/store/admin/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({})
    }, {}, auth)
    return parseStoreAdminOrderDetail(data)
  },
  async retryProcessing(orderId: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(`/api/store/admin/orders/${orderId}/retry-processing`, {
      method: 'POST',
      body: JSON.stringify({})
    }, {}, auth)
    return parseRetryProcessingResult(data)
  }
}
