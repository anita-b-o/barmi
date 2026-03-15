export type StorePaymentInitiateReq = {
  orderId: string
  provider: string
  returnUrl: string
}

export type EcosystemPaymentInitiateReq = {
  ecosystemId: string
  orderId: string
  provider: string
  returnUrl: string
}

export type PaymentInitiateRes = {
  intentId: string
  scope: string
  orderId: string
  status: string
  amount: number
  currency: string
  createdAt: string
  checkoutUrl: string
  provider: string
  providerPreferenceId: string
}
