import { requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type {
  StoreAdminProduct,
  StoreOperationalReport,
  StoreOperationalReportRange,
  StoreAnalyticsSummary,
  StoreAdminProductCreateReq,
  StoreAdminProductUpdateReq,
  StoreCategory,
  StoreCategoryCreateReq,
  StorePromotion,
  StorePromotionCreateReq,
  StorePromotionType,
  StoreAdminDiscoverySettings,
  StoreAdminDiscoveryUpdateReq,
  StoreShippingZone,
  StoreShippingZoneCreateReq,
  StoreShippingZoneType,
  StoreAdminDiscoveryCategoryOption,
  StoreAdminDiscoveryEcosystem
} from '../contracts/v1/storeAdmin'
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

function parseDiscoveryEcosystem(data: unknown, message: string): StoreAdminDiscoveryEcosystem {
  assertRecord(data, message)
  assertString(data.id, `${message}: id is required`)
  assertString(data.slug, `${message}: slug is required`)
  assertString(data.name, `${message}: name is required`)
  return {
    id: data.id,
    slug: data.slug,
    name: data.name
  }
}

function parseDiscoveryCategoryOption(data: unknown, message: string): StoreAdminDiscoveryCategoryOption {
  assertRecord(data, message)
  assertString(data.key, `${message}: key is required`)
  assertString(data.label, `${message}: label is required`)
  return {
    key: data.key,
    label: data.label
  }
}

function parseType(value: unknown, message: string): StoreShippingZoneType {
  if (value === 'EXACT' || value === 'RANGE') return value
  throw new Error(message)
}

function parsePromotionType(value: unknown, message: string): StorePromotionType {
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

export function parseStoreCategory(data: unknown): StoreCategory {
  assertRecord(data, 'Invalid store category payload')
  assertString(data.id, 'Store category id is required')
  assertString(data.storeId, 'Store category storeId is required')
  assertString(data.name, 'Store category name is required')
  assertBoolean(data.active, 'Store category active is required')
  assertNumber(data.sortOrder, 'Store category sortOrder is required')
  assertString(data.createdAt, 'Store category createdAt is required')

  return {
    id: data.id,
    storeId: data.storeId,
    name: data.name,
    active: data.active,
    sortOrder: data.sortOrder,
    createdAt: data.createdAt
  }
}

export function parseStoreCategories(data: unknown): StoreCategory[] {
  assertArray(data, 'Invalid store categories payload')
  return data.map((item, index) => {
    try {
      return parseStoreCategory(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid store category'
      throw new Error(`Store category at ${index} is invalid: ${message}`)
    }
  })
}

export function parseStoreAdminProduct(data: unknown): StoreAdminProduct {
  assertRecord(data, 'Invalid store admin product payload')
  assertString(data.id, 'Store admin product id is required')
  assertString(data.storeId, 'Store admin product storeId is required')
  assertString(data.sku, 'Store admin product sku is required')
  assertString(data.name, 'Store admin product name is required')
  assertNumber(data.priceCents, 'Store admin product priceCents is required')
  assertNumber(data.stockQuantity, 'Store admin product stockQuantity is required')
  assertNullableString(data.categoryId, 'Store admin product categoryId is invalid')
  assertNullableString(data.categoryName, 'Store admin product categoryName is invalid')
  assertBoolean(data.isActive, 'Store admin product isActive is required')
  assertBoolean(data.isAvailable, 'Store admin product isAvailable is required')
  assertString(data.createdAt, 'Store admin product createdAt is required')

  return {
    id: data.id,
    storeId: data.storeId,
    sku: data.sku,
    name: data.name,
    priceCents: data.priceCents,
    stockQuantity: data.stockQuantity,
    categoryId: data.categoryId ?? null,
    categoryName: data.categoryName ?? null,
    isActive: data.isActive,
    isAvailable: data.isAvailable,
    createdAt: data.createdAt
  }
}

export function parseStoreAdminProducts(data: unknown): StoreAdminProduct[] {
  assertArray(data, 'Invalid store admin products payload')
  return data.map((item, index) => {
    try {
      return parseStoreAdminProduct(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid store admin product'
      throw new Error(`Store admin product at ${index} is invalid: ${message}`)
    }
  })
}

export function parseStoreAnalyticsSummary(data: unknown): StoreAnalyticsSummary {
  assertRecord(data, 'Invalid store analytics summary payload')
  assertString(data.storeId, 'Store analytics storeId is required')
  assertString(data.storeSlug, 'Store analytics storeSlug is required')
  assertNumber(data.totalOrders, 'Store analytics totalOrders is required')
  assertNumber(data.confirmedSalesTotalAmount, 'Store analytics confirmedSalesTotalAmount is required')
  assertNullableString(data.confirmedSalesCurrency, 'Store analytics confirmedSalesCurrency is invalid')
  assertNumber(data.activeProducts, 'Store analytics activeProducts is required')
  assertNumber(data.inactiveProducts, 'Store analytics inactiveProducts is required')

  return {
    storeId: data.storeId,
    storeSlug: data.storeSlug,
    totalOrders: data.totalOrders,
    ordersByStatus: parseCountsRecord(data.ordersByStatus, ['PENDING_PAYMENT', 'PAID', 'CANCELLED'], 'Store analytics ordersByStatus'),
    confirmedSalesTotalAmount: data.confirmedSalesTotalAmount,
    confirmedSalesCurrency: data.confirmedSalesCurrency ?? null,
    fulfillmentsByStatus: parseCountsRecord(data.fulfillmentsByStatus, ['PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'], 'Store analytics fulfillmentsByStatus'),
    activeProducts: data.activeProducts,
    inactiveProducts: data.inactiveProducts
  }
}

function parseStoreOperationalReportRange(value: unknown): StoreOperationalReportRange {
  if (value === 'today' || value === '7d' || value === '30d') return value
  throw new Error('Store operational report rangeKey is invalid')
}

export function parseStoreOperationalReport(data: unknown): StoreOperationalReport {
  assertRecord(data, 'Invalid store operational report payload')
  assertString(data.storeId, 'Store operational report storeId is required')
  assertString(data.storeSlug, 'Store operational report storeSlug is required')
  assertString(data.rangeLabel, 'Store operational report rangeLabel is required')
  assertString(data.from, 'Store operational report from is required')
  assertString(data.to, 'Store operational report to is required')
  assertString(data.timezone, 'Store operational report timezone is required')
  assertRecord(data.periodMetrics, 'Store operational report periodMetrics is required')
  assertRecord(data.currentSnapshot, 'Store operational report currentSnapshot is required')
  assertNumber(data.periodMetrics.ordersCreated, 'Store operational report periodMetrics ordersCreated is required')
  const paymentsConfirmed = data.periodMetrics.paymentsConfirmed ?? data.periodMetrics.ordersPaid
  assertNumber(paymentsConfirmed, 'Store operational report periodMetrics paymentsConfirmed is required')
  if (!(data.periodMetrics.ordersPaid === undefined || typeof data.periodMetrics.ordersPaid === 'number')) {
    throw new Error('Store operational report periodMetrics ordersPaid is invalid')
  }
  assertNumber(data.periodMetrics.manualCancellations, 'Store operational report periodMetrics manualCancellations is required')
  assertNumber(data.periodMetrics.stockConflicts, 'Store operational report periodMetrics stockConflicts is required')
  assertNumber(data.periodMetrics.fulfillmentsCreated, 'Store operational report periodMetrics fulfillmentsCreated is required')
  assertNumber(data.periodMetrics.confirmedSalesTotalAmount, 'Store operational report periodMetrics confirmedSalesTotalAmount is required')
  assertNullableString(data.periodMetrics.confirmedSalesCurrency, 'Store operational report periodMetrics confirmedSalesCurrency is invalid')

  return {
    storeId: data.storeId,
    storeSlug: data.storeSlug,
    rangeKey: parseStoreOperationalReportRange(data.rangeKey),
    rangeLabel: data.rangeLabel,
    from: data.from,
    to: data.to,
    timezone: data.timezone,
    periodMetrics: {
      ordersCreated: data.periodMetrics.ordersCreated,
      paymentsConfirmed,
      ordersPaid: data.periodMetrics.ordersPaid ?? paymentsConfirmed,
      manualCancellations: data.periodMetrics.manualCancellations,
      stockConflicts: data.periodMetrics.stockConflicts,
      fulfillmentsCreated: data.periodMetrics.fulfillmentsCreated,
      confirmedSalesTotalAmount: data.periodMetrics.confirmedSalesTotalAmount,
      confirmedSalesCurrency: data.periodMetrics.confirmedSalesCurrency ?? null
    },
    currentSnapshot: {
      fulfillmentsByStatus: parseCountsRecord(data.currentSnapshot.fulfillmentsByStatus, ['PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'], 'Store operational report currentSnapshot fulfillmentsByStatus')
    }
  }
}

export function parseStoreShippingZone(data: unknown): StoreShippingZone {
  assertRecord(data, 'Invalid store shipping zone payload')
  assertString(data.zoneId, 'Store shipping zone zoneId is required')
  assertString(data.storeId, 'Store shipping zone storeId is required')
  const type = parseType(data.type, 'Store shipping zone type is required')
  assertNullableString(data.postalCode, 'Store shipping zone postalCode is invalid')
  assertNullableNumber(data.rangeStart, 'Store shipping zone rangeStart is invalid')
  assertNullableNumber(data.rangeEnd, 'Store shipping zone rangeEnd is invalid')
  assertNumber(data.costAmount, 'Store shipping zone costAmount is required')
  assertString(data.currency, 'Store shipping zone currency is required')
  assertString(data.createdAt, 'Store shipping zone createdAt is required')

  if (type === 'EXACT' && data.postalCode === null) {
    throw new Error('Store shipping zone postalCode is required for EXACT')
  }
  if (type === 'RANGE') {
    if (data.rangeStart === null || data.rangeEnd === null) {
      throw new Error('Store shipping zone rangeStart/rangeEnd are required for RANGE')
    }
  }

  return {
    zoneId: data.zoneId,
    storeId: data.storeId,
    type,
    postalCode: data.postalCode ?? null,
    rangeStart: data.rangeStart ?? null,
    rangeEnd: data.rangeEnd ?? null,
    costAmount: data.costAmount,
    currency: data.currency,
    createdAt: data.createdAt
  }
}

export function parseStorePromotion(data: unknown): StorePromotion {
  assertRecord(data, 'Invalid store promotion payload')
  assertString(data.id, 'Store promotion id is required')
  assertString(data.storeId, 'Store promotion storeId is required')
  assertString(data.code, 'Store promotion code is required')
  assertNumber(data.value, 'Store promotion value is required')
  assertBoolean(data.active, 'Store promotion active is required')
  assertNullableString(data.expirationDate, 'Store promotion expirationDate is invalid')
  assertNullableNumber(data.usageLimit, 'Store promotion usageLimit is invalid')
  assertNumber(data.usageCount, 'Store promotion usageCount is required')
  assertString(data.createdAt, 'Store promotion createdAt is required')

  return {
    id: data.id,
    storeId: data.storeId,
    code: data.code,
    type: parsePromotionType(data.type, 'Store promotion type is required'),
    value: data.value,
    active: data.active,
    expirationDate: data.expirationDate ?? null,
    usageLimit: data.usageLimit ?? null,
    usageCount: data.usageCount,
    createdAt: data.createdAt
  }
}

export function parseStorePromotions(data: unknown): StorePromotion[] {
  assertArray(data, 'Invalid store promotions payload')
  return data.map((item, index) => {
    try {
      return parseStorePromotion(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid store promotion'
      throw new Error(`Store promotion at ${index} is invalid: ${message}`)
    }
  })
}

export function parseStoreAdminDiscoverySettings(data: unknown): StoreAdminDiscoverySettings {
  assertRecord(data, 'Invalid store admin discovery settings payload')
  assertString(data.storeId, 'Store admin discovery storeId is required')
  assertString(data.storeSlug, 'Store admin discovery storeSlug is required')
  assertString(data.storeName, 'Store admin discovery storeName is required')
  assertString(data.actorRole, 'Store admin discovery actorRole is required')
  assertNullableString(data.publicCategoryKey, 'Store admin discovery publicCategoryKey is invalid')
  assertNullableString(data.publicLocationLabel, 'Store admin discovery publicLocationLabel is invalid')
  assertNullableNumber(data.publicLatitude, 'Store admin discovery publicLatitude is invalid')
  assertNullableNumber(data.publicLongitude, 'Store admin discovery publicLongitude is invalid')
  assertArray(data.ecosystems, 'Store admin discovery ecosystems are invalid')
  assertArray(data.categories, 'Store admin discovery categories are invalid')
  if (!(data.ecosystem === null || data.ecosystem === undefined || typeof data.ecosystem === 'object')) {
    throw new Error('Store admin discovery ecosystem is invalid')
  }
  return {
    storeId: data.storeId,
    storeSlug: data.storeSlug,
    storeName: data.storeName,
    actorRole: data.actorRole,
    ecosystem: data.ecosystem ? parseDiscoveryEcosystem(data.ecosystem, 'Store admin discovery ecosystem is invalid') : null,
    publicCategoryKey: data.publicCategoryKey ?? null,
    publicLocationLabel: data.publicLocationLabel ?? null,
    publicLatitude: data.publicLatitude ?? null,
    publicLongitude: data.publicLongitude ?? null,
    ecosystems: data.ecosystems.map((item, index) => parseDiscoveryEcosystem(item, `Store admin discovery ecosystem option at ${index} is invalid`)),
    categories: data.categories.map((item, index) => parseDiscoveryCategoryOption(item, `Store admin discovery category option at ${index} is invalid`))
  }
}

export function parseStoreShippingZones(data: unknown): StoreShippingZone[] {
  assertArray(data, 'Invalid store shipping zones payload')
  return data.map((item, index) => parseStoreShippingZoneWithIndex(item, index))
}

function parseStoreShippingZoneWithIndex(data: unknown, index: number): StoreShippingZone {
  try {
    return parseStoreShippingZone(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid store shipping zone'
    throw new Error(`Store shipping zone at ${index} is invalid: ${message}`)
  }
}

export const storeAdminAdapter = {
  async getDiscoverySettings(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/admin/discovery', {}, {}, auth)
    return parseStoreAdminDiscoverySettings(data)
  },
  async updateDiscoverySettings(payload: StoreAdminDiscoveryUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/admin/discovery',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreAdminDiscoverySettings(data)
  },
  async getAnalyticsSummary(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/analytics/summary', {}, {}, auth)
    return parseStoreAnalyticsSummary(data)
  },
  async getOperationalReport(range: StoreOperationalReportRange, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(`/api/store/analytics/report?range=${encodeURIComponent(range)}`, {}, {}, auth)
    return parseStoreOperationalReport(data)
  },
  async listProducts(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/products', {}, {}, auth)
    return parseStoreAdminProducts(data)
  },
  async listCategories(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/categories', {}, {}, auth)
    return parseStoreCategories(data)
  },
  async createCategory(payload: StoreCategoryCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/categories',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreCategory(data)
  },
  async updateCategoryActive(id: string, active: boolean, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/categories/${id}/active`,
      {
        method: 'PATCH',
        body: JSON.stringify({ active })
      },
      {},
      auth
    )
    return parseStoreCategory(data)
  },
  async createProduct(payload: StoreAdminProductCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/products',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreAdminProduct(data)
  },
  async getProduct(id: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(`/api/store/products/${id}`, {}, {}, auth)
    return parseStoreAdminProduct(data)
  },
  async updateProduct(id: string, payload: StoreAdminProductUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreAdminProduct(data)
  },
  async deleteProduct(id: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/products/${id}`,
      { method: 'DELETE' },
      {},
      auth
    )
    return parseStoreAdminProduct(data)
  },
  async listZones(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/shipping/zones', {}, {}, auth)
    return parseStoreShippingZones(data)
  },
  async createZone(payload: StoreShippingZoneCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/shipping/zones',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreShippingZone(data)
  },
  async deleteZone(zoneId: string, auth: AuthRequestContext) {
    await requestJsonWithAuth<unknown>(
      `/api/store/shipping/zones/${zoneId}`,
      { method: 'DELETE' },
      {},
      auth
    )
  },
  async listPromotions(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/promotions', {}, {}, auth)
    return parseStorePromotions(data)
  },
  async createPromotion(payload: StorePromotionCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/promotions',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStorePromotion(data)
  },
  async updatePromotionActive(id: string, active: boolean, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/promotions/${id}/active`,
      {
        method: 'PATCH',
        body: JSON.stringify({ active })
      },
      {},
      auth
    )
    return parseStorePromotion(data)
  }
}
