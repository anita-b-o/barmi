import { describe, expect, it } from 'vitest'
import checkoutSample from '../_samples/store.checkout.success.json'
import ordersSample from '../_samples/store.orders.page.json'
import orderDetailSample from '../_samples/store.order.detail.json'
import shippingQuoteSample from '../_samples/store.shipping.quote.json'
import {
  parseStoreAdminOrderDetail,
  parseStoreAdminOrdersPage,
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
    expect(res.discountAmount).toBe(0)
    expect(res.appliedCouponCode).toBeNull()
  })

  it('parses orders page sample', () => {
    const res = parseStoreOrdersPage(ordersSample)
    expect(res.totalElements).toBe(2)
    expect(res.content[0].orderId).toBe('ce0a6d48-564c-4340-ab9d-e3d2339eb4f9')
    expect(res.content[0].operationalIssue?.code).toBe('STOCK_CONFLICT')
    expect(res.content[1].operationalIssue).toBeNull()
  })

  it('parses order detail sample', () => {
    const res = parseStoreOrderDetail(orderDetailSample)
    expect(res.orderId).toBe('ce0a6d48-564c-4340-ab9d-e3d2339eb4f9')
    expect(res.items).toHaveLength(2)
    expect(res.shipping?.zoneId).toBe('44444444-4444-4444-4444-444444444444')
    expect(res.payment?.providerPaymentId).toBe('mp_conflict_visible')
    expect(res.discountAmount).toBe(40)
    expect(res.appliedCouponCode).toBe('BIENVENIDA10')
    expect(res.fulfillment?.status).toBe('DISPATCHED')
    expect(res.operationalIssue?.items[0].sku).toBe('SKU-APPLE')
  })

  it('parses admin orders page payload with derived indicators', () => {
    const res = parseStoreAdminOrdersPage({
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 10,
      content: [{
        orderId: 'ce0a6d48-564c-4340-ab9d-e3d2339eb4f9',
        status: 'PENDING_PAYMENT',
        createdAt: '2026-03-10T10:00:00.000Z',
        totalAmount: 390,
        currency: 'ARS',
        operationalIssue: {
          code: 'STOCK_CONFLICT',
          title: 'Conflicto de stock post-pago',
          message: 'Pago confirmado con conflicto operativo de stock pendiente de revisión.',
          detectedAt: null,
          items: []
        },
        hasFulfillment: false,
        paymentConfirmed: true,
        manuallyCancelled: false,
        canCancel: true,
        canRetryProcessing: true
      }]
    })

    expect(res.content[0].paymentConfirmed).toBe(true)
    expect(res.content[0].canRetryProcessing).toBe(true)
  })

  it('parses admin order detail payload with operational summary', () => {
    const res = parseStoreAdminOrderDetail({
      ...orderDetailSample,
      operationalSummary: {
        status: 'PENDING_PAYMENT',
        paymentConfirmed: true,
        hasOperationalConflict: true,
        hasFulfillment: false,
        manuallyCancelled: false,
        canCancel: true,
        canRetryProcessing: true
      },
      timeline: [{
        code: 'ORDER_CREATED',
        title: 'Orden creada',
        description: 'La orden STORE quedó registrada en backend.',
        occurredAt: '2026-03-10T10:00:00.000Z'
      }]
    })

    expect(res.operationalSummary.hasOperationalConflict).toBe(true)
    expect(res.timeline).toHaveLength(1)
  })

  it('parses shipping quote sample', () => {
    const res = parseStoreShippingQuote(shippingQuoteSample)
    expect(res.postalCode).toBe('1900')
    expect(res.type).toBe('EXACT')
    expect(res.costAmount).toBe(0.0)
  })
})
