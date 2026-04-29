import type { EcosystemCheckoutPreviewRes, EcosystemCheckoutRes, EcosystemShippingQuoteRes } from '../../../../api/contracts/v1/ecosystem'
import type { PublicEcosystem } from '../../../../api/contracts/v1/public'

export type EcosystemCheckoutCartItemViewModel = {
  externalProductId: string
  name: string
  unitPriceAmount: number
  qty: number
  currency: string
  deliverySupported?: boolean
}

export type EcosystemCheckoutPreview = EcosystemCheckoutPreviewRes & {
  items: EcosystemCheckoutCartItemViewModel[]
  postalCode: string
  canQuoteShipping: boolean
}

export type EcosystemCheckoutSuccessState = {
  ecosystem: PublicEcosystem
  order: EcosystemCheckoutRes
  quote: EcosystemShippingQuoteRes | null
  submittedItems: EcosystemCheckoutCartItemViewModel[]
}
