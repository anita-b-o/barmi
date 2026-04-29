import { requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type {
  EcosystemAnalyticsSummary,
  EcosystemOperationalReport,
  EcosystemOperationalReportRange,
  EcosystemFulfillment,
  EcosystemFulfillmentStatus,
  EcosystemExternalProduct,
  EcosystemExternalProductCreateReq,
  EcosystemExternalProductUpdateReq,
  EcosystemPromotion,
  EcosystemPromotionCreateReq,
  EcosystemPromotionType,
  EcosystemShippingZone,
  EcosystemShippingZoneCreateReq,
  EcosystemShippingZoneType
} from '../contracts/v1/ecosystemAdmin'
import { assertArray, assertNumber, assertRecord, assertString } from './validators'

function assertBoolean(value: unknown, message: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(message)
}

function assertNullableString(value: unknown, message: string): asserts value is string | null {
  if (value === null) return
  if (typeof value !== 'string') throw new Error(message)
}

function assertNullableNumber(value: unknown, message: string): asserts value is number | null {
  if (value === null) return
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(message)
}

function parseShippingZoneType(value: unknown, message: string): EcosystemShippingZoneType {
  if (value === 'EXACT' || value === 'RANGE') return value
  throw new Error(message)
}

function parseFulfillmentStatus(value: unknown, message: string): EcosystemFulfillmentStatus {
  if (value === 'PENDING' || value === 'DISPATCHED' || value === 'DELIVERED' || value === 'CANCELLED') return value
  throw new Error(message)
}

function parsePromotionType(value: unknown, message: string): EcosystemPromotionType {
  if (value === 'FIXED' || value === 'PERCENTAGE') return value
  throw new Error(message)
}

function parseCountsRecord<T extends string>(value: unknown, allowedKeys: readonly T[], messagePrefix: string): Record<T, number> {
  assertRecord(value, messagePrefix)
  const parsed = {} as Record<T, number>
  allowedKeys.forEach((key) => {
    assertNumber(value[key], `${messagePrefix} ${key} is required`)
    parsed[key] = value[key]
  })
  return parsed
}

export function parseEcosystemExternalProduct(data: unknown): EcosystemExternalProduct {
  assertRecord(data, 'Invalid ecosystem external product payload')
  assertString(data.id, 'Ecosystem external product id is required')
  assertString(data.ecosystemId, 'Ecosystem external product ecosystemId is required')
  assertString(data.name, 'Ecosystem external product name is required')
  assertNumber(data.priceAmount, 'Ecosystem external product priceAmount is required')
  assertString(data.currency, 'Ecosystem external product currency is required')
  assertBoolean(data.deliverySupported, 'Ecosystem external product deliverySupported is required')
  assertBoolean(data.isActive, 'Ecosystem external product isActive is required')
  assertString(data.createdAt, 'Ecosystem external product createdAt is required')
  return {
    id: data.id,
    ecosystemId: data.ecosystemId,
    name: data.name,
    priceAmount: data.priceAmount,
    currency: data.currency,
    deliverySupported: data.deliverySupported,
    isActive: data.isActive,
    createdAt: data.createdAt
  }
}

export function parseEcosystemExternalProducts(data: unknown): EcosystemExternalProduct[] {
  assertArray(data, 'Invalid ecosystem external products payload')
  return data.map((item, index) => parseEcosystemExternalProductWithIndex(item, index))
}

export function parseEcosystemShippingZone(data: unknown): EcosystemShippingZone {
  assertRecord(data, 'Invalid ecosystem shipping zone payload')
  assertString(data.zoneId, 'Ecosystem shipping zone zoneId is required')
  assertString(data.ecosystemId, 'Ecosystem shipping zone ecosystemId is required')
  const type = parseShippingZoneType(data.type, 'Ecosystem shipping zone type is required')
  assertNullableString(data.postalCode, 'Ecosystem shipping zone postalCode is invalid')
  assertNullableNumber(data.rangeStart, 'Ecosystem shipping zone rangeStart is invalid')
  assertNullableNumber(data.rangeEnd, 'Ecosystem shipping zone rangeEnd is invalid')
  assertNumber(data.costAmount, 'Ecosystem shipping zone costAmount is required')
  assertString(data.currency, 'Ecosystem shipping zone currency is required')
  assertBoolean(data.isActive, 'Ecosystem shipping zone isActive is required')
  assertString(data.createdAt, 'Ecosystem shipping zone createdAt is required')

  if (type === 'EXACT' && data.postalCode === null) {
    throw new Error('Ecosystem shipping zone postalCode is required for EXACT')
  }
  if (type === 'RANGE' && (data.rangeStart === null || data.rangeEnd === null)) {
    throw new Error('Ecosystem shipping zone rangeStart/rangeEnd are required for RANGE')
  }

  return {
    zoneId: data.zoneId,
    ecosystemId: data.ecosystemId,
    type,
    postalCode: data.postalCode ?? null,
    rangeStart: data.rangeStart ?? null,
    rangeEnd: data.rangeEnd ?? null,
    costAmount: data.costAmount,
    currency: data.currency,
    isActive: data.isActive,
    createdAt: data.createdAt
  }
}

export function parseEcosystemShippingZones(data: unknown): EcosystemShippingZone[] {
  assertArray(data, 'Invalid ecosystem shipping zones payload')
  return data.map((item, index) => {
    try {
      return parseEcosystemShippingZone(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid ecosystem shipping zone'
      throw new Error(`Ecosystem shipping zone at ${index} is invalid: ${message}`)
    }
  })
}

export function parseEcosystemFulfillment(data: unknown): EcosystemFulfillment {
  assertRecord(data, 'Invalid ecosystem fulfillment payload')
  assertString(data.fulfillmentId, 'Ecosystem fulfillment fulfillmentId is required')
  assertString(data.ecosystemOrderId, 'Ecosystem fulfillment ecosystemOrderId is required')
  assertString(data.ecosystemId, 'Ecosystem fulfillment ecosystemId is required')
  assertString(data.method, 'Ecosystem fulfillment method is required')
  assertString(data.createdAt, 'Ecosystem fulfillment createdAt is required')

  return {
    fulfillmentId: data.fulfillmentId,
    ecosystemOrderId: data.ecosystemOrderId,
    ecosystemId: data.ecosystemId,
    status: parseFulfillmentStatus(data.status, 'Ecosystem fulfillment status is required'),
    method: data.method,
    createdAt: data.createdAt
  }
}

export function parseEcosystemFulfillments(data: unknown): EcosystemFulfillment[] {
  assertArray(data, 'Invalid ecosystem fulfillments payload')
  return data.map((item, index) => {
    try {
      return parseEcosystemFulfillment(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid ecosystem fulfillment'
      throw new Error(`Ecosystem fulfillment at ${index} is invalid: ${message}`)
    }
  })
}

export function parseEcosystemPromotion(data: unknown): EcosystemPromotion {
  assertRecord(data, 'Invalid ecosystem promotion payload')
  assertString(data.id, 'Ecosystem promotion id is required')
  assertString(data.ecosystemId, 'Ecosystem promotion ecosystemId is required')
  assertString(data.code, 'Ecosystem promotion code is required')
  assertNumber(data.value, 'Ecosystem promotion value is required')
  assertBoolean(data.active, 'Ecosystem promotion active is required')
  assertNullableString(data.expirationDate, 'Ecosystem promotion expirationDate is invalid')
  assertNullableNumber(data.usageLimit, 'Ecosystem promotion usageLimit is invalid')
  assertNumber(data.usageCount, 'Ecosystem promotion usageCount is required')
  assertString(data.createdAt, 'Ecosystem promotion createdAt is required')

  return {
    id: data.id,
    ecosystemId: data.ecosystemId,
    code: data.code,
    type: parsePromotionType(data.type, 'Ecosystem promotion type is required'),
    value: data.value,
    active: data.active,
    expirationDate: data.expirationDate ?? null,
    usageLimit: data.usageLimit ?? null,
    usageCount: data.usageCount,
    createdAt: data.createdAt
  }
}

export function parseEcosystemPromotions(data: unknown): EcosystemPromotion[] {
  assertArray(data, 'Invalid ecosystem promotions payload')
  return data.map((item, index) => {
    try {
      return parseEcosystemPromotion(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid ecosystem promotion'
      throw new Error(`Ecosystem promotion at ${index} is invalid: ${message}`)
    }
  })
}

export function parseEcosystemAnalyticsSummary(data: unknown): EcosystemAnalyticsSummary {
  assertRecord(data, 'Invalid ecosystem analytics summary payload')
  assertString(data.ecosystemId, 'Ecosystem analytics ecosystemId is required')
  assertString(data.ecosystemSlug, 'Ecosystem analytics ecosystemSlug is required')
  assertNumber(data.totalOrders, 'Ecosystem analytics totalOrders is required')
  assertNumber(data.confirmedSalesTotalAmount, 'Ecosystem analytics confirmedSalesTotalAmount is required')
  assertNullableString(data.confirmedSalesCurrency, 'Ecosystem analytics confirmedSalesCurrency is invalid')
  assertNumber(data.activeExternalProducts, 'Ecosystem analytics activeExternalProducts is required')
  assertNumber(data.inactiveExternalProducts, 'Ecosystem analytics inactiveExternalProducts is required')

  return {
    ecosystemId: data.ecosystemId,
    ecosystemSlug: data.ecosystemSlug,
    totalOrders: data.totalOrders,
    ordersByStatus: parseCountsRecord(data.ordersByStatus, ['PENDING_PAYMENT', 'PAID', 'CANCELLED'], 'Ecosystem analytics ordersByStatus'),
    confirmedSalesTotalAmount: data.confirmedSalesTotalAmount,
    confirmedSalesCurrency: data.confirmedSalesCurrency ?? null,
    fulfillmentsByStatus: parseCountsRecord(data.fulfillmentsByStatus, ['PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'], 'Ecosystem analytics fulfillmentsByStatus'),
    activeExternalProducts: data.activeExternalProducts,
    inactiveExternalProducts: data.inactiveExternalProducts
  }
}

function parseEcosystemOperationalReportRange(value: unknown, message: string): EcosystemOperationalReportRange {
  if (value === 'today' || value === '7d' || value === '30d') return value
  throw new Error(message)
}

export function parseEcosystemOperationalReport(data: unknown): EcosystemOperationalReport {
  assertRecord(data, 'Invalid ecosystem operational report payload')
  assertString(data.ecosystemId, 'Ecosystem operational report ecosystemId is required')
  assertString(data.ecosystemSlug, 'Ecosystem operational report ecosystemSlug is required')
  assertString(data.rangeLabel, 'Ecosystem operational report rangeLabel is required')
  assertString(data.from, 'Ecosystem operational report from is required')
  assertString(data.to, 'Ecosystem operational report to is required')
  assertString(data.timezone, 'Ecosystem operational report timezone is required')
  assertRecord(data.periodMetrics, 'Ecosystem operational report periodMetrics is required')
  assertNumber(data.periodMetrics.ordersCreated, 'Ecosystem operational report periodMetrics.ordersCreated is required')
  assertNumber(data.periodMetrics.paymentsConfirmed, 'Ecosystem operational report periodMetrics.paymentsConfirmed is required')
  assertNumber(data.periodMetrics.fulfillmentsCreated, 'Ecosystem operational report periodMetrics.fulfillmentsCreated is required')
  assertNumber(data.periodMetrics.confirmedSalesTotalAmount, 'Ecosystem operational report periodMetrics.confirmedSalesTotalAmount is required')
  assertNullableString(data.periodMetrics.confirmedSalesCurrency, 'Ecosystem operational report periodMetrics.confirmedSalesCurrency is invalid')
  assertRecord(data.currentSnapshot, 'Ecosystem operational report currentSnapshot is required')

  return {
    ecosystemId: data.ecosystemId,
    ecosystemSlug: data.ecosystemSlug,
    rangeKey: parseEcosystemOperationalReportRange(data.rangeKey, 'Ecosystem operational report rangeKey is required'),
    rangeLabel: data.rangeLabel,
    from: data.from,
    to: data.to,
    timezone: data.timezone,
    periodMetrics: {
      ordersCreated: data.periodMetrics.ordersCreated,
      paymentsConfirmed: data.periodMetrics.paymentsConfirmed,
      fulfillmentsCreated: data.periodMetrics.fulfillmentsCreated,
      confirmedSalesTotalAmount: data.periodMetrics.confirmedSalesTotalAmount,
      confirmedSalesCurrency: data.periodMetrics.confirmedSalesCurrency ?? null
    },
    currentSnapshot: {
      fulfillmentsByStatus: parseCountsRecord(
        data.currentSnapshot.fulfillmentsByStatus,
        ['PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
        'Ecosystem operational report currentSnapshot.fulfillmentsByStatus'
      )
    }
  }
}

function parseEcosystemExternalProductWithIndex(data: unknown, index: number): EcosystemExternalProduct {
  try {
    return parseEcosystemExternalProduct(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid ecosystem external product'
    throw new Error(`Ecosystem external product at ${index} is invalid: ${message}`)
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const ecosystemAdminAdapter = {
  async getAnalyticsSummary(ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/analytics/summary${qs}`, {}, {}, auth)
    return parseEcosystemAnalyticsSummary(data)
  },
  async getOperationalReport(ecosystemId: string, range: EcosystemOperationalReportRange, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId, range })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/analytics/report${qs}`, {}, {}, auth)
    return parseEcosystemOperationalReport(data)
  },
  async listProducts(
    ecosystemId: string,
    auth: AuthRequestContext,
    options: { activeOnly?: boolean; query?: string } = {}
  ) {
    const qs = buildQuery({ ecosystemId, activeOnly: options.activeOnly ?? true, query: options.query })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/products${qs}`, {}, {}, auth)
    return parseEcosystemExternalProducts(data)
  },
  async createProduct(payload: EcosystemExternalProductCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/ecosystem/admin/products',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseEcosystemExternalProduct(data)
  },
  async getProduct(id: string, ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/products/${id}${qs}`, {}, {}, auth)
    return parseEcosystemExternalProduct(data)
  },
  async updateProduct(id: string, payload: EcosystemExternalProductUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/ecosystem/admin/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseEcosystemExternalProduct(data)
  },
  async deleteProduct(id: string, ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/products/${id}${qs}`, { method: 'DELETE' }, {}, auth)
    return parseEcosystemExternalProduct(data)
  },
  async listShippingZones(ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/shipping/zones${qs}`, {}, {}, auth)
    return parseEcosystemShippingZones(data)
  },
  async createShippingZone(payload: EcosystemShippingZoneCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/ecosystem/admin/shipping/zones',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseEcosystemShippingZone(data)
  },
  async deleteShippingZone(zoneId: string, ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    await requestJsonWithAuth<unknown>(
      `/api/ecosystem/admin/shipping/zones/${zoneId}${qs}`,
      { method: 'DELETE' },
      {},
      auth
    )
  },
  async listPromotions(ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/promotions${qs}`, {}, {}, auth)
    return parseEcosystemPromotions(data)
  },
  async createPromotion(payload: EcosystemPromotionCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/ecosystem/admin/promotions',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseEcosystemPromotion(data)
  },
  async updatePromotionActive(id: string, ecosystemId: string, active: boolean, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/ecosystem/admin/promotions/${id}/active`,
      {
        method: 'PATCH',
        body: JSON.stringify({ ecosystemId, active })
      },
      {},
      auth
    )
    return parseEcosystemPromotion(data)
  },
  async listFulfillments(
    ecosystemId: string,
    auth: AuthRequestContext,
    options: { createdFrom?: string; createdTo?: string } = {}
  ) {
    const qs = buildQuery({ ecosystemId, createdFrom: options.createdFrom, createdTo: options.createdTo })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/fulfillments${qs}`, {}, {}, auth)
    return parseEcosystemFulfillments(data)
  },
  async getFulfillment(fulfillmentId: string, ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/fulfillments/${fulfillmentId}${qs}`, {}, {}, auth)
    return parseEcosystemFulfillment(data)
  },
  async createFulfillment(orderId: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/ecosystem/orders/${orderId}/fulfillment`,
      { method: 'POST' },
      {},
      auth
    )
    return parseEcosystemFulfillment(data)
  },
  async updateFulfillmentStatus(
    fulfillmentId: string,
    status: EcosystemFulfillmentStatus,
    auth: AuthRequestContext
  ) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/ecosystem/fulfillments/${fulfillmentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      },
      {},
      auth
    )
    return parseEcosystemFulfillment(data)
  }
}
