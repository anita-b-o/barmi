import type { StoreCheckoutPreviewRes, StoreCheckoutRes, StoreShippingQuoteRes } from '../../../../api/contracts/v1/store'

export type StoreCartItemViewModel = {
  productId: string
  name: string
  priceCents: number
  qty: number
  stockQuantity?: number | null
  isAvailable?: boolean | null
}

export type StoreCheckoutPreview = {
  items: StoreCartItemViewModel[]
  postalCode: string
  subtotalAmount: number
  originalAmount: number
  discountAmount: number
  appliedCouponCode: string | null
  shippingCostAmount: number
  totalAmount: number
  currency: string
}

export type StoreCheckoutSuccessState = {
  order: StoreCheckoutRes
  quote: StoreShippingQuoteRes | null
  submittedItems: StoreCartItemViewModel[]
}

export type StoreCouponPreviewState = {
  status: 'idle' | 'valid' | 'invalid'
  message: string | null
  totals: StoreCheckoutPreviewRes | null
}
