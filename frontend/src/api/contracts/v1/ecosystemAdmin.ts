export type EcosystemExternalProduct = {
  id: string
  ecosystemId: string
  name: string
  priceAmount: number
  currency: string
  deliverySupported: boolean
  isActive: boolean
  createdAt: string
}

export type EcosystemPromotionType = 'FIXED' | 'PERCENTAGE'

export type EcosystemPromotion = {
  id: string
  ecosystemId: string
  code: string
  type: EcosystemPromotionType
  value: number
  active: boolean
  expirationDate: string | null
  usageLimit: number | null
  usageCount: number
  createdAt: string
}

export type EcosystemPromotionCreateReq = {
  ecosystemId: string
  code: string
  type: EcosystemPromotionType
  value: number
  active: boolean
  expirationDate: string | null
  usageLimit: number | null
}

export type EcosystemExternalProductCreateReq = {
  ecosystemId: string
  name: string
  priceAmount: number
  currency: string
  deliverySupported: boolean
  isActive: boolean
}

export type EcosystemExternalProductUpdateReq = {
  ecosystemId: string
  name: string
  priceAmount: number
  currency: string
  deliverySupported: boolean
  isActive: boolean
}

export type EcosystemFulfillmentStatus = 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'

export type EcosystemFulfillment = {
  fulfillmentId: string
  ecosystemOrderId: string
  ecosystemId: string
  status: EcosystemFulfillmentStatus
  method: string
  createdAt: string
}

export type EcosystemAnalyticsSummary = {
  ecosystemId: string
  ecosystemSlug: string
  totalOrders: number
  ordersByStatus: Record<'PENDING_PAYMENT' | 'PAID' | 'CANCELLED', number>
  confirmedSalesTotalAmount: number
  confirmedSalesCurrency: string | null
  fulfillmentsByStatus: Record<'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED', number>
  activeExternalProducts: number
  inactiveExternalProducts: number
}

export type EcosystemOperationalReportRange = 'today' | '7d' | '30d'

export type EcosystemOperationalReport = {
  ecosystemId: string
  ecosystemSlug: string
  rangeKey: EcosystemOperationalReportRange
  rangeLabel: string
  from: string
  to: string
  timezone: string
  periodMetrics: {
    ordersCreated: number
    paymentsConfirmed: number
    fulfillmentsCreated: number
    confirmedSalesTotalAmount: number
    confirmedSalesCurrency: string | null
  }
  currentSnapshot: {
    fulfillmentsByStatus: Record<'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED', number>
  }
}

export type EcosystemShippingZoneType = 'EXACT' | 'RANGE'

export type EcosystemShippingZone = {
  zoneId: string
  ecosystemId: string
  type: EcosystemShippingZoneType
  postalCode: string | null
  rangeStart: number | null
  rangeEnd: number | null
  costAmount: number
  currency: string
  isActive: boolean
  createdAt: string
}

export type EcosystemShippingZoneCreateExactReq = {
  ecosystemId: string
  type: 'EXACT'
  postalCode: string
  costAmount: number
  currency: string
}

export type EcosystemShippingZoneCreateRangeReq = {
  ecosystemId: string
  type: 'RANGE'
  rangeStart: number
  rangeEnd: number
  costAmount: number
  currency: string
}

export type EcosystemShippingZoneCreateReq =
  | EcosystemShippingZoneCreateExactReq
  | EcosystemShippingZoneCreateRangeReq
