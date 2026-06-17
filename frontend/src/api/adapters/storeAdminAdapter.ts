import { requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type {
  StoreAdminProduct,
  StoreAppearance,
  StoreAppearancePreset,
  StoreAppearanceUpdateReq,
  StoreAssetUpload,
  StoreBranding,
  StoreBrandingUpdateReq,
  StoreCapabilities,
  StoreCapability,
  StoreCapabilityMetadata,
  StoreCapabilityPreset,
  StoreCapabilityPresetKey,
  StoreCapabilityPresets,
  StoreCapabilitiesUpdateReq,
  StorePublicProfile,
  StorePublicProfileUpdateReq,
  StoreReadiness,
  StoreReadinessStep,
  StoreOperationalReport,
  StoreOperationalReportRange,
  StoreProductAnalytics,
  StoreProductAnalyticsRow,
  StoreProductAnalyticsRange,
  StoreCommerceAnalytics,
  StoreCommerceAnalyticsTopProduct,
  StoreFunnelAnalytics,
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

function parseStoreCapability(value: unknown, message: string): StoreCapability {
  if (
    value === 'ABOUT' ||
    value === 'GALLERY' ||
    value === 'BLOG' ||
    value === 'PRODUCTS' ||
    value === 'RESERVATIONS' ||
    value === 'PROMOTIONS' ||
    value === 'SHIPPING' ||
    value === 'CHECKOUT' ||
    value === 'CONTACT'
  ) {
    return value
  }
  throw new Error(message)
}

function parseStoreCapabilityPresetKey(value: unknown, message: string): StoreCapabilityPresetKey {
  if (
    value === 'ONLINE_STORE' ||
    value === 'SERVICES' ||
    value === 'PORTFOLIO' ||
    value === 'BLOG' ||
    value === 'SIMPLE_PAGE'
  ) {
    return value
  }
  throw new Error(message)
}

function parseStoreAppearancePreset(value: unknown, message: string): StoreAppearancePreset {
  if (
    value === 'MODERN' ||
    value === 'CLASSIC' ||
    value === 'LOCAL_BUSINESS' ||
    value === 'PORTFOLIO'
  ) {
    return value
  }
  throw new Error(message)
}

function parseHexColor(value: unknown, message: string): string {
  assertString(value, message)
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) throw new Error(message)
  return value
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

function parseStoreCapabilityMetadata(data: unknown, index: number): StoreCapabilityMetadata {
  assertRecord(data, `Store capability metadata at ${index} is invalid`)
  assertString(data.label, `Store capability metadata at ${index} label is required`)
  assertString(data.description, `Store capability metadata at ${index} description is required`)
  return {
    key: parseStoreCapability(data.key, `Store capability metadata at ${index} key is invalid`),
    label: data.label,
    description: data.description
  }
}

export function parseStoreCapabilities(data: unknown): StoreCapabilities {
  assertRecord(data, 'Invalid store capabilities payload')
  assertArray(data.enabled, 'Store capabilities enabled is required')
  assertArray(data.available, 'Store capabilities available is required')
  return {
    enabled: data.enabled.map((item, index) => parseStoreCapability(item, `Store capability enabled at ${index} is invalid`)),
    available: data.available.map((item, index) => parseStoreCapabilityMetadata(item, index))
  }
}

export function parseStorePublicProfile(data: unknown): StorePublicProfile {
  assertRecord(data, 'Invalid store public profile payload')
  assertNullableString(data.publicDescription, 'Store public profile publicDescription is invalid')
  assertNullableString(data.publicEmail, 'Store public profile publicEmail is invalid')
  assertNullableString(data.publicPhone, 'Store public profile publicPhone is invalid')
  assertNullableString(data.publicWhatsapp, 'Store public profile publicWhatsapp is invalid')
  return {
    publicDescription: data.publicDescription ?? null,
    publicEmail: data.publicEmail ?? null,
    publicPhone: data.publicPhone ?? null,
    publicWhatsapp: data.publicWhatsapp ?? null
  }
}

export function parseStoreAppearance(data: unknown): StoreAppearance {
  assertRecord(data, 'Invalid store appearance payload')
  return {
    preset: parseStoreAppearancePreset(data.preset, 'Store appearance preset is invalid')
  }
}

export function parseStoreBranding(data: unknown): StoreBranding {
  assertRecord(data, 'Invalid store branding payload')
  assertNullableString(data.logoUrl, 'Store branding logoUrl is invalid')
  assertNullableString(data.bannerUrl, 'Store branding bannerUrl is invalid')
  return {
    logoUrl: data.logoUrl ?? null,
    bannerUrl: data.bannerUrl ?? null,
    primaryColor: parseHexColor(data.primaryColor, 'Store branding primaryColor is invalid'),
    secondaryColor: parseHexColor(data.secondaryColor, 'Store branding secondaryColor is invalid')
  }
}

export function parseStoreAssetUpload(data: unknown): StoreAssetUpload {
  assertRecord(data, 'Invalid store asset upload payload')
  assertString(data.url, 'Store asset upload url is required')
  return { url: data.url }
}

function parseStoreCapabilityPreset(data: unknown, index: number): StoreCapabilityPreset {
  assertRecord(data, `Store capability preset at ${index} is invalid`)
  assertString(data.name, `Store capability preset at ${index} name is required`)
  assertString(data.description, `Store capability preset at ${index} description is required`)
  assertArray(data.capabilities, `Store capability preset at ${index} capabilities is required`)
  return {
    key: parseStoreCapabilityPresetKey(data.key, `Store capability preset at ${index} key is invalid`),
    name: data.name,
    description: data.description,
    capabilities: data.capabilities.map((item, capabilityIndex) => parseStoreCapability(item, `Store capability preset at ${index} capability ${capabilityIndex} is invalid`))
  }
}

export function parseStoreCapabilityPresets(data: unknown): StoreCapabilityPresets {
  assertRecord(data, 'Invalid store capability presets payload')
  assertArray(data.presets, 'Store capability presets is required')
  return {
    presets: data.presets.map((item, index) => parseStoreCapabilityPreset(item, index))
  }
}

function parseStoreReadinessStep(data: unknown, index: number): StoreReadinessStep {
  assertRecord(data, `Store readiness step at ${index} is invalid`)
  assertString(data.id, `Store readiness step at ${index} id is required`)
  assertString(data.label, `Store readiness step at ${index} label is required`)
  assertString(data.ctaLabel, `Store readiness step at ${index} ctaLabel is required`)
  assertNullableString(data.ctaRoute, `Store readiness step at ${index} ctaRoute is invalid`)
  assertBoolean(data.required, `Store readiness step at ${index} required is required`)
  assertBoolean(data.blocksPublishing, `Store readiness step at ${index} blocksPublishing is required`)
  assertBoolean(data.implemented, `Store readiness step at ${index} implemented is required`)
  assertBoolean(data.completed, `Store readiness step at ${index} completed is required`)
  return {
    id: data.id,
    capability: parseStoreCapability(data.capability, `Store readiness step at ${index} capability is invalid`),
    label: data.label,
    ctaLabel: data.ctaLabel,
    ctaRoute: data.ctaRoute ?? null,
    required: data.required,
    blocksPublishing: data.blocksPublishing,
    implemented: data.implemented,
    completed: data.completed
  }
}

export function parseStoreReadiness(data: unknown): StoreReadiness {
  assertRecord(data, 'Invalid store readiness payload')
  assertNumber(data.score, 'Store readiness score is required')
  assertBoolean(data.publishReady, 'Store readiness publishReady is required')
  assertArray(data.completedSteps, 'Store readiness completedSteps is required')
  assertArray(data.pendingSteps, 'Store readiness pendingSteps is required')
  assertArray(data.blockers, 'Store readiness blockers is required')
  assertArray(data.enabledCapabilities, 'Store readiness enabledCapabilities is required')
  assertArray(data.steps, 'Store readiness steps is required')
  return {
    score: data.score,
    publishReady: data.publishReady,
    completedSteps: data.completedSteps.map((item, index) => {
      assertString(item, `Store readiness completedSteps at ${index} is invalid`)
      return item
    }),
    pendingSteps: data.pendingSteps.map((item, index) => {
      assertString(item, `Store readiness pendingSteps at ${index} is invalid`)
      return item
    }),
    blockers: data.blockers.map((item, index) => {
      assertString(item, `Store readiness blockers at ${index} is invalid`)
      return item
    }),
    enabledCapabilities: data.enabledCapabilities.map((item, index) => parseStoreCapability(item, `Store readiness enabledCapabilities at ${index} is invalid`)),
    steps: data.steps.map((item, index) => parseStoreReadinessStep(item, index))
  }
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

function parseStoreProductAnalyticsRange(value: unknown): StoreProductAnalyticsRange {
  if (value === '7d') return value
  throw new Error('Store product analytics rangeKey is invalid')
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

function parseStoreProductAnalyticsRow(data: unknown, index: number): StoreProductAnalyticsRow {
  assertRecord(data, `Store product analytics product at ${index} is invalid`)
  assertString(data.productSlug, `Store product analytics product at ${index} productSlug is required`)
  assertNumber(data.detailViews, `Store product analytics product at ${index} detailViews is required`)
  assertNumber(data.cardClicks, `Store product analytics product at ${index} cardClicks is required`)
  assertNumber(data.addToCart, `Store product analytics product at ${index} addToCart is required`)
  assertNumber(data.ctrPercent, `Store product analytics product at ${index} ctrPercent is required`)
  assertNumber(data.addToCartRatePercent, `Store product analytics product at ${index} addToCartRatePercent is required`)

  return {
    productSlug: data.productSlug,
    detailViews: data.detailViews,
    cardClicks: data.cardClicks,
    addToCart: data.addToCart,
    ctrPercent: data.ctrPercent,
    addToCartRatePercent: data.addToCartRatePercent
  }
}

export function parseStoreProductAnalytics(data: unknown): StoreProductAnalytics {
  assertRecord(data, 'Invalid store product analytics payload')
  assertString(data.storeId, 'Store product analytics storeId is required')
  assertString(data.storeSlug, 'Store product analytics storeSlug is required')
  assertString(data.rangeLabel, 'Store product analytics rangeLabel is required')
  assertString(data.from, 'Store product analytics from is required')
  assertString(data.to, 'Store product analytics to is required')
  assertString(data.timezone, 'Store product analytics timezone is required')
  assertRecord(data.totals, 'Store product analytics totals is required')
  assertNumber(data.totals.detailViews, 'Store product analytics totals detailViews is required')
  assertNumber(data.totals.cardClicks, 'Store product analytics totals cardClicks is required')
  assertNumber(data.totals.addToCart, 'Store product analytics totals addToCart is required')
  assertNumber(data.totals.ctrPercent, 'Store product analytics totals ctrPercent is required')
  assertNumber(data.totals.addToCartRatePercent, 'Store product analytics totals addToCartRatePercent is required')
  assertArray(data.products, 'Store product analytics products is required')

  return {
    storeId: data.storeId,
    storeSlug: data.storeSlug,
    rangeKey: parseStoreProductAnalyticsRange(data.rangeKey),
    rangeLabel: data.rangeLabel,
    from: data.from,
    to: data.to,
    timezone: data.timezone,
    totals: {
      detailViews: data.totals.detailViews,
      cardClicks: data.totals.cardClicks,
      addToCart: data.totals.addToCart,
      ctrPercent: data.totals.ctrPercent,
      addToCartRatePercent: data.totals.addToCartRatePercent
    },
    products: data.products.map((item, index) => parseStoreProductAnalyticsRow(item, index))
  }
}

function parseStoreCommerceAnalyticsTopProduct(data: unknown, index: number): StoreCommerceAnalyticsTopProduct {
  assertRecord(data, `Store commerce analytics topProduct at ${index} is invalid`)
  assertString(data.productSlug, `Store commerce analytics topProduct at ${index} productSlug is required`)
  assertString(data.productName, `Store commerce analytics topProduct at ${index} productName is required`)
  assertNumber(data.quantitySold, `Store commerce analytics topProduct at ${index} quantitySold is required`)
  assertNumber(data.revenueCents, `Store commerce analytics topProduct at ${index} revenueCents is required`)

  return {
    productSlug: data.productSlug,
    productName: data.productName,
    quantitySold: data.quantitySold,
    revenueCents: data.revenueCents
  }
}

export function parseStoreCommerceAnalytics(data: unknown): StoreCommerceAnalytics {
  assertRecord(data, 'Invalid store commerce analytics payload')
  assertNumber(data.orders, 'Store commerce analytics orders is required')
  assertNumber(data.revenueCents, 'Store commerce analytics revenueCents is required')
  assertNumber(data.averageOrderValueCents, 'Store commerce analytics averageOrderValueCents is required')
  assertNumber(data.productsSold, 'Store commerce analytics productsSold is required')
  assertArray(data.topProducts, 'Store commerce analytics topProducts is required')

  return {
    orders: data.orders,
    revenueCents: data.revenueCents,
    averageOrderValueCents: data.averageOrderValueCents,
    productsSold: data.productsSold,
    topProducts: data.topProducts.map((item, index) => parseStoreCommerceAnalyticsTopProduct(item, index))
  }
}

export function parseStoreFunnelAnalytics(data: unknown): StoreFunnelAnalytics {
  assertRecord(data, 'Invalid store funnel analytics payload')
  assertNumber(data.listViews, 'Store funnel analytics listViews is required')
  assertNumber(data.cardClicks, 'Store funnel analytics cardClicks is required')
  assertNumber(data.detailViews, 'Store funnel analytics detailViews is required')
  assertNumber(data.addToCart, 'Store funnel analytics addToCart is required')
  assertNumber(data.orders, 'Store funnel analytics orders is required')
  assertNumber(data.revenueCents, 'Store funnel analytics revenueCents is required')
  assertNumber(data.clickRate, 'Store funnel analytics clickRate is required')
  assertNumber(data.detailRate, 'Store funnel analytics detailRate is required')
  assertNumber(data.addToCartRate, 'Store funnel analytics addToCartRate is required')
  assertNumber(data.purchaseRate, 'Store funnel analytics purchaseRate is required')

  return {
    listViews: data.listViews,
    cardClicks: data.cardClicks,
    detailViews: data.detailViews,
    addToCart: data.addToCart,
    orders: data.orders,
    revenueCents: data.revenueCents,
    clickRate: data.clickRate,
    detailRate: data.detailRate,
    addToCartRate: data.addToCartRate,
    purchaseRate: data.purchaseRate
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
  async getStoreReadiness(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/readiness', {}, {}, auth)
    return parseStoreReadiness(data)
  },
  async getStoreCapabilities(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/capabilities', {}, {}, auth)
    return parseStoreCapabilities(data)
  },
  async updateStoreCapabilities(payload: StoreCapabilitiesUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/capabilities',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreCapabilities(data)
  },
  async getStorePublicProfile(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/profile', {}, {}, auth)
    return parseStorePublicProfile(data)
  },
  async updateStorePublicProfile(payload: StorePublicProfileUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/profile',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStorePublicProfile(data)
  },
  async getStoreAppearance(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/appearance', {}, {}, auth)
    return parseStoreAppearance(data)
  },
  async updateStoreAppearance(payload: StoreAppearanceUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/appearance',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreAppearance(data)
  },
  async getStoreBranding(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/branding', {}, {}, auth)
    return parseStoreBranding(data)
  },
  async updateStoreBranding(payload: StoreBrandingUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/branding',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreBranding(data)
  },
  async uploadStoreLogo(file: File, auth: AuthRequestContext) {
    const body = new FormData()
    body.append('file', file)
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/assets/logo',
      {
        method: 'POST',
        body
      },
      {},
      auth
    )
    return parseStoreAssetUpload(data)
  },
  async uploadStoreBanner(file: File, auth: AuthRequestContext) {
    const body = new FormData()
    body.append('file', file)
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/assets/banner',
      {
        method: 'POST',
        body
      },
      {},
      auth
    )
    return parseStoreAssetUpload(data)
  },
  async listStoreCapabilityPresets(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/capability-presets', {}, {}, auth)
    return parseStoreCapabilityPresets(data)
  },
  async applyStoreCapabilityPreset(presetKey: StoreCapabilityPresetKey, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/capability-presets/${encodeURIComponent(presetKey)}/apply`,
      { method: 'POST' },
      {},
      auth
    )
    return parseStoreCapabilities(data)
  },
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
  async getProductAnalytics(range: StoreProductAnalyticsRange, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(`/api/store/analytics/products?range=${encodeURIComponent(range)}`, {}, {}, auth)
    return parseStoreProductAnalytics(data)
  },
  async getCommerceAnalytics(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/analytics/commerce?range=7d', {}, {}, auth)
    return parseStoreCommerceAnalytics(data)
  },
  async getFunnelAnalytics(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/analytics/funnel?range=7d', {}, {}, auth)
    return parseStoreFunnelAnalytics(data)
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
