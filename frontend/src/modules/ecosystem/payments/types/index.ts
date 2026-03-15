import type { EcosystemOrderStatus } from '../../../../api/contracts/v1/ecosystem'
import type { PaymentInitiateRes } from '../../../../api/contracts/v1/payments'

export type EcosystemPaymentInitiateInput = {
  orderId: string
  orderStatus: EcosystemOrderStatus
  ecosystemId?: string | null
}

export type EcosystemPaymentInitiateState = {
  isPayable: boolean
  resolvedEcosystemId: string | null
  error: string | null
  isLoading: boolean
  paymentIntent: PaymentInitiateRes | null
}
