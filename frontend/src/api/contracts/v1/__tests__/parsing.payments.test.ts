import { describe, expect, it } from 'vitest'
import storeSample from '../_samples/payment.store.initiate.success.json'
import ecoSample from '../_samples/payment.ecosystem.initiate.success.json'
import { parsePaymentInitiateRes } from '../../../adapters/paymentAdapter'

describe('payment initiation contracts parsing', () => {
  it('parses store payment initiate sample', () => {
    const res = parsePaymentInitiateRes(storeSample)
    expect(res.scope).toBe('STORE')
    expect(res.provider).toBe('MERCADOPAGO')
  })

  it('parses ecosystem payment initiate sample', () => {
    const res = parsePaymentInitiateRes(ecoSample)
    expect(res.scope).toBe('ECOSYSTEM')
    expect(res.checkoutUrl).toContain('checkout.mercadopago')
  })
})
