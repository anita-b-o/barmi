import type { StoreOrderItem, StoreOrderPayment, StoreOrderStatus } from '../../../../api/contracts/v1/store'

export type StoreOrderStatusFilter = StoreOrderStatus | 'ALL'

export type StoreOrderListItem = {
  orderId: string
  status: StoreOrderStatus
  createdAt: string
  currency: string
  totalAmount: number
}

export type StoreOrderDetailViewModel = {
  orderId: string
  status: StoreOrderStatus
  currency: string
  createdAt: string
  subtotalAmount: number
  shippingCostAmount: number
  totalAmount: number
  shippingZoneId: string | null
  shippingPostalCode: string | null
  items: StoreOrderItem[]
  payment: StoreOrderPayment | null
}
