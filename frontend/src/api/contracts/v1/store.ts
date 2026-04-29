export type StoreOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED'

export type StoreOrderOperationalIssueItem = {
  productId: string | null
  sku: string | null
  availableQuantity: number
  requestedQuantity: number
}

export type StoreOrderOperationalIssue = {
  code: 'STOCK_CONFLICT'
  title: string
  message: string
  detectedAt: string | null
  items: StoreOrderOperationalIssueItem[]
}

export type StoreCheckoutReq = {
  items: Array<{ productId: string; qty: number }>
  shipping: { postalCode: string }
  couponCode?: string | null
  buyerEmail?: string | null
}

export type StoreCheckoutTotals = {
  subtotalAmount: number
  originalAmount: number
  discountAmount: number
  appliedCouponCode: string | null
  totalAmount: number
  shippingCostAmount: number
  shippingCurrency: string
  shippingZoneId: string | null
  shippingPostalCode: string | null
}

export type StoreCheckoutPreviewRes = StoreCheckoutTotals & {
  currency: string
}

export type StoreCheckoutRes = StoreCheckoutTotals & {
  createdAt: string
  orderId: string
  currency: string
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
  operationalIssue: StoreOrderOperationalIssue | null
}

export type StoreOrdersPage = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  content: StoreOrderSummary[]
}

export type StoreAdminOrderSummary = {
  orderId: string
  status: StoreOrderStatus
  createdAt: string
  totalAmount: number
  currency: string
  operationalIssue: StoreOrderOperationalIssue | null
  hasFulfillment: boolean
  paymentConfirmed: boolean
  manuallyCancelled: boolean
  canCancel: boolean
  canRetryProcessing: boolean
}

export type StoreAdminOrdersPage = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  content: StoreAdminOrderSummary[]
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

export type StoreOrderFulfillment = {
  fulfillmentId: string
  status: string
  method: string
  createdAt: string
}

export type StoreOrderTimelineEvent = {
  code: string
  title: string
  description: string
  occurredAt: string
}

export type StoreAdminOrderOperationalSummary = {
  status: StoreOrderStatus
  paymentConfirmed: boolean
  hasOperationalConflict: boolean
  hasFulfillment: boolean
  manuallyCancelled: boolean
  canCancel: boolean
  canRetryProcessing: boolean
}

export type StoreOrderRetryProcessingResult = {
  status: StoreOrderStatus
  resolved: boolean
  stillConflicted: boolean
  fulfillmentId: string | null
}

export type StoreOrderDetail = {
  orderId: string
  status: StoreOrderStatus
  createdAt: string
  currency: string
  subtotalAmount: number
  originalAmount: number
  discountAmount: number
  appliedCouponCode: string | null
  shippingCostAmount: number
  totalAmount: number
  items: StoreOrderItem[]
  shipping: StoreOrderShipping | null
  payment: StoreOrderPayment | null
  fulfillment: StoreOrderFulfillment | null
  operationalIssue: StoreOrderOperationalIssue | null
}

export type StoreAdminOrderDetail = StoreOrderDetail & {
  operationalSummary: StoreAdminOrderOperationalSummary
  timeline: StoreOrderTimelineEvent[]
}
