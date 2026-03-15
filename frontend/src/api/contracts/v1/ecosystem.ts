export type EcosystemOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | string

export type EcosystemShippingQuoteRes = {
  ecosystemId: string
  postalCode: string
  available: boolean
  zoneId: string | null
  type: 'EXACT' | 'RANGE' | null
  costAmount: number | null
  currency: string | null
}

export type EcosystemCheckoutReq = {
  ecosystemId: string
  items: Array<{ externalProductId: string; qty: number }>
  shipping?: { postalCode: string }
}

export type EcosystemCheckoutRes = {
  id: string
  ecosystemId: string
  status: EcosystemOrderStatus
  currency: string
  subtotalAmount: number
  shippingCostAmount: number
  totalAmount: number
  createdAt: string
}

export type EcosystemOrderSummary = {
  orderId: string
  status: EcosystemOrderStatus
  createdAt: string
  totalAmount: number
  currency: string
}

export type EcosystemOrdersPage = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  content: EcosystemOrderSummary[]
}

export type EcosystemOrderItem = {
  productId: string
  name: string
  qty: number
  unitPriceAmount: number
  lineTotalAmount: number
  currency: string
}

export type EcosystemOrderShipping = null | { zoneId: string; postalCode: string }

export type EcosystemOrderPayment = {
  status: string
  provider: string
  providerPaymentId: string
  confirmedAt: string
}

export type EcosystemOrderDetail = {
  orderId: string
  status: EcosystemOrderStatus
  createdAt: string
  currency: string
  subtotalAmount: number
  shippingCostAmount: number
  totalAmount: number
  items: EcosystemOrderItem[]
  shipping: EcosystemOrderShipping
  payment: EcosystemOrderPayment | null
}
