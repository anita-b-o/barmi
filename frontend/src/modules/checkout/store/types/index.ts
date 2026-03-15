import type { StoreCheckoutRes, StoreShippingQuoteRes } from '../../../../api/contracts/v1/store'

export type StoreCartItemViewModel = {
  productId: string
  name: string
  priceCents: number
  qty: number
}

export type StoreCheckoutPreview = {
  items: StoreCartItemViewModel[]
  postalCode: string
  subtotalAmount: number
  shippingCostAmount: number
  totalAmount: number
  currency: string
}

export type StoreCheckoutSuccessState = {
  order: StoreCheckoutRes
  quote: StoreShippingQuoteRes | null
  submittedItems: StoreCartItemViewModel[]
}
