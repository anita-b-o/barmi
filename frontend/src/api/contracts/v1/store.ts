export type StoreOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED'

export type StoreCheckoutReq = {
  items: Array<{ productId: string; qty: number }>
  shipping: { postalCode: string }
}

export type StoreCheckoutRes = {
  totalAmount: number
  createdAt: string
  shippingZoneId: string
  orderId: string
  shippingCurrency: string
  shippingCostAmount: number
  currency: string
  shippingPostalCode: string
  subtotalAmount: number
  status: StoreOrderStatus
}

export type StoreShippingQuoteRes = {
  postalCode: string
  type: 'EXACT'
  zoneId: string
  costAmount: number
  currency: string
}

export type StoreOrderSummary = {
  orderId: string
  status: StoreOrderStatus
  createdAt: string
  totalAmount: number
  currency: string
}

export type StoreOrdersPage = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  content: StoreOrderSummary[]
}

export type StoreOrderItem = {
  productId: string
  name: string
  qty: number
  unitPriceAmount: number
  lineTotalAmount: number
  currency: string
}

export type StoreOrderShipping = {
  zoneId: string
  postalCode: string
}

export type StoreOrderPayment = {
  status: string
  provider: string
  providerPaymentId: string
  confirmedAt: string
}

export type StoreOrderDetail = {
  orderId: string
  status: StoreOrderStatus
  createdAt: string
  currency: string
  subtotalAmount: number
  shippingCostAmount: number
  totalAmount: number
  items: StoreOrderItem[]
  shipping: StoreOrderShipping | null
  payment: StoreOrderPayment | null
}
