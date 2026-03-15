import type { EcosystemCheckoutRes, EcosystemShippingQuoteRes } from '../../../../api/contracts/v1/ecosystem'
import type { PublicEcosystem } from '../../../../api/contracts/v1/public'

export type EcosystemCheckoutCartItemViewModel = {
  externalProductId: string
  name: string
  unitPriceAmount: number
  qty: number
  currency: string
  deliverySupported?: boolean
}

export type EcosystemCheckoutPreview = {
  items: EcosystemCheckoutCartItemViewModel[]
  postalCode: string
  subtotalAmount: number
  shippingCostAmount: number
  totalAmount: number
  currency: string
  canQuoteShipping: boolean
}

export type EcosystemCheckoutSuccessState = {
  ecosystem: PublicEcosystem
  order: EcosystemCheckoutRes
  quote: EcosystemShippingQuoteRes | null
  submittedItems: EcosystemCheckoutCartItemViewModel[]
}
