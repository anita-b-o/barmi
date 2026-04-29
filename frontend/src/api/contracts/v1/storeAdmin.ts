export type StoreShippingZoneType = 'EXACT' | 'RANGE'
export type StorePromotionType = 'FIXED' | 'PERCENTAGE'

export type StoreAdminProduct = {
  id: string
  storeId: string
  sku: string
  name: string
  priceCents: number
  stockQuantity: number
  categoryId: string | null
  categoryName: string | null
  isActive: boolean
  isAvailable: boolean
  createdAt: string
}

export type StoreCategory = {
  id: string
  storeId: string
  name: string
  active: boolean
  sortOrder: number
  createdAt: string
}

export type StoreAdminProductCreateReq = {
  sku: string
  name: string
  priceCents: number
  stockQuantity: number
  categoryId?: string | null
}

export type StoreAdminProductUpdateReq = {
  sku: string
  name: string
  priceCents: number
  stockQuantity: number
  categoryId?: string | null
}

export type StoreCategoryCreateReq = {
  name: string
  sortOrder?: number
}

export type StoreAnalyticsSummary = {
  storeId: string
  storeSlug: string
  totalOrders: number
  ordersByStatus: Record<'PENDING_PAYMENT' | 'PAID' | 'CANCELLED', number>
  confirmedSalesTotalAmount: number
  confirmedSalesCurrency: string | null
  fulfillmentsByStatus: Record<'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED', number>
  activeProducts: number
  inactiveProducts: number
}

export type StoreOperationalReportRange = 'today' | '7d' | '30d'

export type StoreOperationalReport = {
  storeId: string
  storeSlug: string
  rangeKey: StoreOperationalReportRange
  rangeLabel: string
  from: string
  to: string
  timezone: string
  periodMetrics: {
    ordersCreated: number
    paymentsConfirmed: number
    ordersPaid?: number
    manualCancellations: number
    stockConflicts: number
    fulfillmentsCreated: number
    confirmedSalesTotalAmount: number
    confirmedSalesCurrency: string | null
  }
  currentSnapshot: {
    fulfillmentsByStatus: Record<'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED', number>
  }
}

export type StoreShippingZone = {
  zoneId: string
  storeId: string
  type: StoreShippingZoneType
  postalCode: string | null
  rangeStart: number | null
  rangeEnd: number | null
  costAmount: number
  currency: string
  createdAt: string
}

export type StoreShippingZoneCreateExactReq = {
  type: 'EXACT'
  postalCode: string
  costAmount: number
  currency: string
}

export type StoreShippingZoneCreateRangeReq = {
  type: 'RANGE'
  rangeStart: number
  rangeEnd: number
  costAmount: number
  currency: string
}

export type StoreShippingZoneCreateReq = StoreShippingZoneCreateExactReq | StoreShippingZoneCreateRangeReq

export type StorePromotion = {
  id: string
  storeId: string
  code: string
  type: StorePromotionType
  value: number
  active: boolean
  expirationDate: string | null
  usageLimit: number | null
  usageCount: number
  createdAt: string
}

export type StorePromotionCreateReq = {
  code: string
  type: StorePromotionType
  value: number
  active?: boolean
  expirationDate?: string | null
  usageLimit?: number | null
}

export type StoreAdminDiscoveryEcosystem = {
  id: string
  slug: string
  name: string
}

export type StoreAdminDiscoveryCategoryOption = {
  key: string
  label: string
}

export type StoreAdminDiscoverySettings = {
  storeId: string
  storeSlug: string
  storeName: string
  actorRole: string
  ecosystem: StoreAdminDiscoveryEcosystem | null
  publicCategoryKey: string | null
  publicLocationLabel: string | null
  publicLatitude: number | null
  publicLongitude: number | null
  ecosystems: StoreAdminDiscoveryEcosystem[]
  categories: StoreAdminDiscoveryCategoryOption[]
}

export type StoreAdminDiscoveryUpdateReq = {
  ecosystemId?: string | null
  publicCategoryKey?: string | null
  publicLocationLabel?: string | null
  publicLatitude?: number | null
  publicLongitude?: number | null
}
