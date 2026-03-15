import { requestJson } from '../client/http'
import {
  StoreCheckoutReq,
  StoreCheckoutRes,
  StoreOrderDetail,
  StoreOrderItem,
  StoreOrderPayment,
  StoreOrderShipping,
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
    currency: data.currency
  }
}

export function parseStoreCheckoutRes(data: unknown): StoreCheckoutRes {
  assertRecord(data, 'Invalid checkout response payload')
  assertNumber(data.totalAmount, 'Checkout totalAmount is required')
  assertString(data.createdAt, 'Checkout createdAt is required')
  assertString(data.shippingZoneId, 'Checkout shippingZoneId is required')
  assertString(data.orderId, 'Checkout orderId is required')
  assertString(data.shippingCurrency, 'Checkout shippingCurrency is required')
  assertNumber(data.shippingCostAmount, 'Checkout shippingCostAmount is required')
  assertString(data.currency, 'Checkout currency is required')
  assertString(data.shippingPostalCode, 'Checkout shippingPostalCode is required')
  assertNumber(data.subtotalAmount, 'Checkout subtotalAmount is required')
  assertStoreStatus(data.status, 'Checkout status is required')
  return {
    totalAmount: data.totalAmount,
    createdAt: data.createdAt,
    shippingZoneId: data.shippingZoneId,
    orderId: data.orderId,
    shippingCurrency: data.shippingCurrency,
    shippingCostAmount: data.shippingCostAmount,
    currency: data.currency,
    shippingPostalCode: data.shippingPostalCode,
    subtotalAmount: data.subtotalAmount,
    status: data.status
  }
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

export function parseStoreOrderDetail(data: unknown): StoreOrderDetail {
  assertRecord(data, 'Invalid order detail payload')
  assertString(data.orderId, 'Order detail orderId is required')
  assertStoreStatus(data.status, 'Order detail status is required')
  assertString(data.createdAt, 'Order detail createdAt is required')
  assertString(data.currency, 'Order detail currency is required')
  assertNumber(data.subtotalAmount, 'Order detail subtotalAmount is required')
  assertNumber(data.shippingCostAmount, 'Order detail shippingCostAmount is required')
  assertNumber(data.totalAmount, 'Order detail totalAmount is required')
  assertArray(data.items, 'Order detail items is required')
  const items = data.items.map((item, index) => parseOrderItem(item, index))
  const shipping = data.shipping === null ? null : parseOrderShipping(data.shipping)
  const payment = parseOrderPayment(data.payment)
  return {
    orderId: data.orderId,
    status: data.status,
    createdAt: data.createdAt,
    currency: data.currency,
    subtotalAmount: data.subtotalAmount,
    shippingCostAmount: data.shippingCostAmount,
    totalAmount: data.totalAmount,
    items,
    shipping,
    payment
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

export const storeAdapter = {
  async getShippingQuote(postalCode: string) {
    const data = await requestJson<unknown>(`/api/store/shipping/quote?postalCode=${encodeURIComponent(postalCode)}`)
    return parseStoreShippingQuote(data)
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
  }
}
