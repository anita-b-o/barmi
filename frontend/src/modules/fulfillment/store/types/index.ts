export type StoreFulfillmentStatus = 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'

export type StoreFulfillmentRecord = {
  fulfillmentId: string
  storeOrderId: string
  storeId: string
  method: string
  status: StoreFulfillmentStatus
  createdAt: string
}

export type StoreFulfillmentUpdateReq = {
  status: StoreFulfillmentStatus
}
