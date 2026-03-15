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
