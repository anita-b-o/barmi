import type {
  StoreAdminOrderOperationalSummary,
  StoreOrderItem,
  StoreOrderOperationalIssue,
  StoreOrderPayment,
  StoreOrderFulfillment,
  StoreOrderStatus,
  StoreOrderTimelineEvent
} from '../../../../api/contracts/v1/store'

export type StoreOrderStatusFilter = StoreOrderStatus | 'ALL'
export type StoreDerivedBooleanFilter = 'ALL' | 'YES' | 'NO'

export type StoreOrderListItem = {
  orderId: string
  status: StoreOrderStatus
  createdAt: string
  currency: string
  totalAmount: number
  operationalIssue: StoreOrderOperationalIssue | null
  hasFulfillment: boolean
  paymentConfirmed: boolean
  manuallyCancelled: boolean
  canCancel: boolean
  canRetryProcessing: boolean
}

export type StoreOrderDetailViewModel = {
  orderId: string
  status: StoreOrderStatus
  currency: string
  createdAt: string
  subtotalAmount: number
  originalAmount: number
  discountAmount: number
  appliedCouponCode: string | null
  shippingCostAmount: number
  totalAmount: number
  shippingZoneId: string | null
  shippingPostalCode: string | null
  items: StoreOrderItem[]
  payment: StoreOrderPayment | null
  fulfillment: StoreOrderFulfillment | null
  operationalIssue: StoreOrderOperationalIssue | null
}

export type StoreAdminOrderDetailViewModel = StoreOrderDetailViewModel & {
  operationalSummary: StoreAdminOrderOperationalSummary
  timeline: StoreOrderTimelineEvent[]
}
