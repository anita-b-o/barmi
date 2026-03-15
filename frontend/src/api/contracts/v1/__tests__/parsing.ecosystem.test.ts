import { describe, expect, it } from 'vitest'
import shippingQuoteSample from '../_samples/ecosystem.shipping.quote.json'
import checkoutSample from '../_samples/ecosystem.checkout.success.json'
import ordersPageSample from '../_samples/ecosystem.orders.page.json'
import orderDetailSample from '../_samples/ecosystem.order.detail.json'
import {
  parseEcosystemCheckoutRes,
  parseEcosystemOrderDetail,
  parseEcosystemOrdersPage,
  parseEcosystemShippingQuote
} from '../../../adapters/ecosystemAdapter'

describe('ecosystem contracts parsing', () => {
  it('parses shipping quote sample', () => {
    const res = parseEcosystemShippingQuote(shippingQuoteSample)
    expect(res.ecosystemId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    expect(res.available).toBe(true)
    expect(res.type).toBe('EXACT')
  })

  it('parses checkout response sample', () => {
    const res = parseEcosystemCheckoutRes(checkoutSample)
    expect(res.id).toBe('22430d7b-7ac1-4774-b806-61a91bbbdda0')
    expect(res.status).toBe('PENDING_PAYMENT')
    expect(res.totalAmount).toBe(150.0)
  })

  it('parses orders page sample', () => {
    const res = parseEcosystemOrdersPage(ordersPageSample)
    expect(res.totalElements).toBe(1)
    expect(res.content[0].orderId).toBe('d62f6906-7bfd-45c4-bfb8-362adad88819')
  })

  it('parses order detail sample', () => {
    const res = parseEcosystemOrderDetail(orderDetailSample)
    expect(res.orderId).toBe('d62f6906-7bfd-45c4-bfb8-362adad88819')
    expect(res.items).toHaveLength(1)
    expect(res.shipping).toBeNull()
  })
})
