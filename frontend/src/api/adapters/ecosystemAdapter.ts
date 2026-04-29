import { requestJson } from '../client/http'
import type {
  EcosystemCheckoutReq,
  EcosystemCheckoutPreviewRes,
  EcosystemCheckoutRes,
  EcosystemOrderDetail,
  EcosystemOrderItem,
  EcosystemOrderPayment,
  EcosystemOrdersPage,
  EcosystemOrderShipping,
  EcosystemOrderSummary,
  EcosystemShippingQuoteRes
} from '../contracts/v1/ecosystem'
import { assertArray, assertNonEmptyString, assertNumber, assertRecord, assertString } from './validators'

function assertStatus(value: unknown, message: string): asserts value is string {
  if (value === 'PENDING_PAYMENT') return
  assertNonEmptyString(value, message)
}

export function parseEcosystemShippingQuote(data: unknown): EcosystemShippingQuoteRes {
  assertRecord(data, 'Invalid ecosystem shipping quote payload')
  assertString(data.ecosystemId, 'Ecosystem shipping quote ecosystemId is required')
  assertString(data.postalCode, 'Ecosystem shipping quote postalCode is required')
  if (typeof data.available !== 'boolean') throw new Error('Ecosystem shipping quote available is required')
  const zoneId = data.zoneId === null ? null : data.zoneId
  const type = data.type === null ? null : data.type
  const costAmount = data.costAmount === null ? null : data.costAmount
  const currency = data.currency === null ? null : data.currency
  if (zoneId !== null) assertString(zoneId, 'Ecosystem shipping quote zoneId is invalid')
  if (type !== null) {
    assertString(type, 'Ecosystem shipping quote type is invalid')
    if (type !== 'EXACT' && type !== 'RANGE') {
      throw new Error('Ecosystem shipping quote type must be EXACT or RANGE')
    }
  }
  if (costAmount !== null) assertNumber(costAmount, 'Ecosystem shipping quote costAmount is invalid')
  if (currency !== null) assertString(currency, 'Ecosystem shipping quote currency is invalid')
  return {
    ecosystemId: data.ecosystemId,
    postalCode: data.postalCode,
    available: data.available,
    zoneId,
    type,
    costAmount,
    currency
  }
}

export function parseEcosystemCheckoutRes(data: unknown): EcosystemCheckoutRes {
  assertRecord(data, 'Invalid ecosystem checkout response payload')
  assertString(data.id, 'Ecosystem checkout id is required')
  assertString(data.ecosystemId, 'Ecosystem checkout ecosystemId is required')
  assertStatus(data.status, 'Ecosystem checkout status is required')
  assertString(data.currency, 'Ecosystem checkout currency is required')
  assertNumber(data.subtotalAmount, 'Ecosystem checkout subtotalAmount is required')
  assertNumber(data.originalAmount, 'Ecosystem checkout originalAmount is required')
  assertNumber(data.discountAmount, 'Ecosystem checkout discountAmount is required')
  if (!(data.appliedCouponCode === null || typeof data.appliedCouponCode === 'string')) {
    throw new Error('Ecosystem checkout appliedCouponCode is invalid')
  }
  assertNumber(data.shippingCostAmount, 'Ecosystem checkout shippingCostAmount is required')
  assertString(data.shippingCurrency, 'Ecosystem checkout shippingCurrency is required')
  if (!(data.shippingZoneId === null || typeof data.shippingZoneId === 'string')) {
    throw new Error('Ecosystem checkout shippingZoneId is invalid')
  }
  if (!(data.shippingPostalCode === null || typeof data.shippingPostalCode === 'string')) {
    throw new Error('Ecosystem checkout shippingPostalCode is invalid')
  }
  assertNumber(data.totalAmount, 'Ecosystem checkout totalAmount is required')
  assertString(data.createdAt, 'Ecosystem checkout createdAt is required')
  return {
    id: data.id,
    ecosystemId: data.ecosystemId,
    status: data.status,
    currency: data.currency,
    subtotalAmount: data.subtotalAmount,
    originalAmount: data.originalAmount,
    discountAmount: data.discountAmount,
    appliedCouponCode: data.appliedCouponCode ?? null,
    shippingCostAmount: data.shippingCostAmount,
    shippingCurrency: data.shippingCurrency,
    shippingZoneId: data.shippingZoneId ?? null,
    shippingPostalCode: data.shippingPostalCode ?? null,
    totalAmount: data.totalAmount,
    createdAt: data.createdAt
  }
}

export function parseEcosystemCheckoutPreview(data: unknown): EcosystemCheckoutPreviewRes {
  assertRecord(data, 'Invalid ecosystem checkout preview payload')
  assertString(data.currency, 'Ecosystem checkout preview currency is required')
  assertNumber(data.subtotalAmount, 'Ecosystem checkout preview subtotalAmount is required')
  assertNumber(data.originalAmount, 'Ecosystem checkout preview originalAmount is required')
  assertNumber(data.discountAmount, 'Ecosystem checkout preview discountAmount is required')
  if (!(data.appliedCouponCode === null || typeof data.appliedCouponCode === 'string')) {
    throw new Error('Ecosystem checkout preview appliedCouponCode is invalid')
  }
  assertNumber(data.shippingCostAmount, 'Ecosystem checkout preview shippingCostAmount is required')
  assertString(data.shippingCurrency, 'Ecosystem checkout preview shippingCurrency is required')
  if (!(data.shippingZoneId === null || typeof data.shippingZoneId === 'string')) {
    throw new Error('Ecosystem checkout preview shippingZoneId is invalid')
  }
  if (!(data.shippingPostalCode === null || typeof data.shippingPostalCode === 'string')) {
    throw new Error('Ecosystem checkout preview shippingPostalCode is invalid')
  }
  assertNumber(data.totalAmount, 'Ecosystem checkout preview totalAmount is required')
  return {
    currency: data.currency,
    subtotalAmount: data.subtotalAmount,
    originalAmount: data.originalAmount,
    discountAmount: data.discountAmount,
    appliedCouponCode: data.appliedCouponCode ?? null,
    shippingCostAmount: data.shippingCostAmount,
    shippingCurrency: data.shippingCurrency,
    shippingZoneId: data.shippingZoneId ?? null,
    shippingPostalCode: data.shippingPostalCode ?? null,
    totalAmount: data.totalAmount
  }
}

function parseOrderSummary(data: unknown, index: number): EcosystemOrderSummary {
  assertRecord(data, `Ecosystem order summary at ${index} is invalid`)
  assertString(data.orderId, `Ecosystem order summary orderId at ${index} is required`)
  assertStatus(data.status, `Ecosystem order summary status at ${index} is required`)
  assertString(data.createdAt, `Ecosystem order summary createdAt at ${index} is required`)
  assertNumber(data.totalAmount, `Ecosystem order summary totalAmount at ${index} is required`)
  assertString(data.currency, `Ecosystem order summary currency at ${index} is required`)
  return {
    orderId: data.orderId,
    status: data.status,
    createdAt: data.createdAt,
    totalAmount: data.totalAmount,
    currency: data.currency
  }
}

export function parseEcosystemOrdersPage(data: unknown): EcosystemOrdersPage {
  assertRecord(data, 'Invalid ecosystem orders page payload')
  assertNumber(data.totalElements, 'Ecosystem orders page totalElements is required')
  assertNumber(data.totalPages, 'Ecosystem orders page totalPages is required')
  assertNumber(data.page, 'Ecosystem orders page page is required')
  assertNumber(data.size, 'Ecosystem orders page size is required')
  assertArray(data.content, 'Ecosystem orders page content is required')
  return {
    totalElements: data.totalElements,
    totalPages: data.totalPages,
    page: data.page,
    size: data.size,
    content: data.content.map((item, index) => parseOrderSummary(item, index))
  }
}

function parseOrderItem(data: unknown, index: number): EcosystemOrderItem {
  assertRecord(data, `Ecosystem order item at ${index} is invalid`)
  assertString(data.productId, `Ecosystem order item productId at ${index} is required`)
  assertString(data.name, `Ecosystem order item name at ${index} is required`)
  assertNumber(data.qty, `Ecosystem order item qty at ${index} is required`)
  assertNumber(data.unitPriceAmount, `Ecosystem order item unitPriceAmount at ${index} is required`)
  assertNumber(data.lineTotalAmount, `Ecosystem order item lineTotalAmount at ${index} is required`)
  assertString(data.currency, `Ecosystem order item currency at ${index} is required`)
  return {
    productId: data.productId,
    name: data.name,
    qty: data.qty,
    unitPriceAmount: data.unitPriceAmount,
    lineTotalAmount: data.lineTotalAmount,
    currency: data.currency
  }
}

function parseShipping(value: unknown): EcosystemOrderShipping {
  if (value === null) return null
  assertRecord(value, 'Ecosystem order shipping is invalid')
  assertString(value.zoneId, 'Ecosystem order shipping zoneId is required')
  assertString(value.postalCode, 'Ecosystem order shipping postalCode is required')
  return {
    zoneId: value.zoneId,
    postalCode: value.postalCode
  }
}

function parsePayment(value: unknown): EcosystemOrderPayment | null {
  if (value === null) return null
  assertRecord(value, 'Ecosystem order payment is invalid')
  assertString(value.status, 'Ecosystem order payment status is required')
  assertString(value.provider, 'Ecosystem order payment provider is required')
  assertString(value.providerPaymentId, 'Ecosystem order payment providerPaymentId is required')
  assertString(value.confirmedAt, 'Ecosystem order payment confirmedAt is required')
  return {
    status: value.status,
    provider: value.provider,
    providerPaymentId: value.providerPaymentId,
    confirmedAt: value.confirmedAt
  }
}

export function parseEcosystemOrderDetail(data: unknown): EcosystemOrderDetail {
  assertRecord(data, 'Invalid ecosystem order detail payload')
  assertString(data.orderId, 'Ecosystem order detail orderId is required')
  assertStatus(data.status, 'Ecosystem order detail status is required')
  assertString(data.createdAt, 'Ecosystem order detail createdAt is required')
  assertString(data.currency, 'Ecosystem order detail currency is required')
  assertNumber(data.subtotalAmount, 'Ecosystem order detail subtotalAmount is required')
  assertNumber(data.shippingCostAmount, 'Ecosystem order detail shippingCostAmount is required')
  assertNumber(data.totalAmount, 'Ecosystem order detail totalAmount is required')
  assertArray(data.items, 'Ecosystem order detail items is required')
  const items = data.items.map((item, index) => parseOrderItem(item, index))
  const shipping = parseShipping(data.shipping)
  const payment = parsePayment(data.payment)
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

export const ecosystemAdapter = {
  async getShippingQuote(ecosystemId: string, postalCode: string) {
    const data = await requestJson<unknown>(
      `/api/ecosystem/shipping/quote?ecosystemId=${encodeURIComponent(ecosystemId)}&postalCode=${encodeURIComponent(postalCode)}`
    )
    return parseEcosystemShippingQuote(data)
  },
  async checkout(payload: EcosystemCheckoutReq) {
    const data = await requestJson<unknown>('/api/ecosystem/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return parseEcosystemCheckoutRes(data)
  },
  async previewCheckout(payload: EcosystemCheckoutReq) {
    const data = await requestJson<unknown>('/api/ecosystem/checkout/preview', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return parseEcosystemCheckoutPreview(data)
  },
  async listOrders(
    page = 0,
    size = 20,
    status?: string,
    options: {
      ecosystemId?: string
      createdFrom?: string
      createdTo?: string
      paidFrom?: string
      paidTo?: string
    } = {}
  ) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size)
    })
    if (status) params.set('status', status)
    if (options.ecosystemId) params.set('ecosystemId', options.ecosystemId)
    if (options.createdFrom) params.set('createdFrom', options.createdFrom)
    if (options.createdTo) params.set('createdTo', options.createdTo)
    if (options.paidFrom) params.set('paidFrom', options.paidFrom)
    if (options.paidTo) params.set('paidTo', options.paidTo)
    const data = await requestJson<unknown>(`/api/ecosystem/orders?${params.toString()}`)
    return parseEcosystemOrdersPage(data)
  },
  async getOrder(orderId: string) {
    const data = await requestJson<unknown>(`/api/ecosystem/orders/${orderId}`)
    return parseEcosystemOrderDetail(data)
  }
}
