import { describe, expect, it } from 'vitest'
import checkoutSample from '../_samples/store.checkout.success.json'
import ordersSample from '../_samples/store.orders.page.json'
import orderDetailSample from '../_samples/store.order.detail.json'
import shippingQuoteSample from '../_samples/store.shipping.quote.json'
import {
  parseStoreCheckoutRes,
  parseStoreOrderDetail,
  parseStoreOrdersPage,
  parseStoreShippingQuote
} from '../../../adapters/storeAdapter'

describe('store contracts parsing', () => {
  it('parses checkout response sample', () => {
    const res = parseStoreCheckoutRes(checkoutSample)
    expect(res.orderId).toBe('ce0a6d48-564c-4340-ab9d-e3d2339eb4f9')
    expect(res.status).toBe('PENDING_PAYMENT')
    expect(res.totalAmount).toBe(390.0)
  })

  it('parses orders page sample', () => {
    const res = parseStoreOrdersPage(ordersSample)
    expect(res.totalElements).toBe(2)
    expect(res.content[0].orderId).toBe('ce0a6d48-564c-4340-ab9d-e3d2339eb4f9')
  })

  it('parses order detail sample', () => {
    const res = parseStoreOrderDetail(orderDetailSample)
    expect(res.orderId).toBe('ce0a6d48-564c-4340-ab9d-e3d2339eb4f9')
    expect(res.items).toHaveLength(2)
    expect(res.shipping?.zoneId).toBe('44444444-4444-4444-4444-444444444444')
    expect(res.payment).toBeNull()
  })

  it('parses shipping quote sample', () => {
    const res = parseStoreShippingQuote(shippingQuoteSample)
    expect(res.postalCode).toBe('1900')
    expect(res.type).toBe('EXACT')
    expect(res.costAmount).toBe(0.0)
  })
})
