export type StoreShippingZoneType = 'EXACT' | 'RANGE'

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
