import { requestJson, requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type { EcosystemPaymentInitiateReq, PaymentInitiateRes, StorePaymentInitiateReq } from '../contracts/v1/payments'
import { assertNumber, assertRecord, assertString } from './validators'

export function parsePaymentInitiateRes(data: unknown): PaymentInitiateRes {
  assertRecord(data, 'Invalid payment initiation payload')
  assertString(data.intentId, 'Payment intentId is required')
  assertString(data.scope, 'Payment scope is required')
  assertString(data.orderId, 'Payment orderId is required')
  assertString(data.status, 'Payment status is required')
  assertNumber(data.amount, 'Payment amount is required')
  assertString(data.currency, 'Payment currency is required')
  assertString(data.createdAt, 'Payment createdAt is required')
  assertString(data.checkoutUrl, 'Payment checkoutUrl is required')
  assertString(data.provider, 'Payment provider is required')
  assertString(data.providerPreferenceId, 'Payment providerPreferenceId is required')
  return {
    intentId: data.intentId,
    scope: data.scope,
    orderId: data.orderId,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    createdAt: data.createdAt,
    checkoutUrl: data.checkoutUrl,
    provider: data.provider,
    providerPreferenceId: data.providerPreferenceId
  }
}

export const paymentAdapter = {
  async initiateStorePayment(payload: StorePaymentInitiateReq) {
    const data = await requestJson<unknown>(
      '/api/store/payments/initiate',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    )
    return parsePaymentInitiateRes(data)
  },
  async initiateEcosystemPayment(payload: EcosystemPaymentInitiateReq, auth?: AuthRequestContext) {
    const init = {
      method: 'POST',
      body: JSON.stringify(payload)
    }
    const data = auth
      ? await requestJsonWithAuth<unknown>('/api/ecosystem/payments/initiate', init, {}, auth)
      : await requestJson<unknown>('/api/ecosystem/payments/initiate', init)
    return parsePaymentInitiateRes(data)
  }
}
