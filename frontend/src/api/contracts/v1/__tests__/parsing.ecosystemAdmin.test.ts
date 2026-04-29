import { describe, expect, it } from 'vitest'
import analyticsReportSample from '../_samples/ecosystem.analytics.report.json'
import analyticsSummarySample from '../_samples/ecosystem.analytics.summary.json'
import fulfillmentSample from '../_samples/ecosystem.admin.fulfillment.json'
import fulfillmentsListSample from '../_samples/ecosystem.admin.fulfillments.list.json'
import promotionSample from '../_samples/ecosystem.admin.promotion.json'
import productsListSample from '../_samples/ecosystem.admin.products.list.json'
import productSample from '../_samples/ecosystem.admin.product.json'
import {
  parseEcosystemOperationalReport,
  parseEcosystemAnalyticsSummary,
  parseEcosystemFulfillment,
  parseEcosystemFulfillments,
  parseEcosystemExternalProduct,
  parseEcosystemExternalProducts,
  parseEcosystemPromotion
} from '../../../adapters/ecosystemAdminAdapter'

describe('ecosystem admin contracts parsing', () => {
  it('parses fulfillments list sample', () => {
    const res = parseEcosystemFulfillments(fulfillmentsListSample)
    expect(res).toHaveLength(2)
    expect(res[0].status).toBe('PENDING')
  })

  it('parses fulfillment sample', () => {
    const res = parseEcosystemFulfillment(fulfillmentSample)
    expect(res.fulfillmentId).toBe('f1111111-1111-1111-1111-111111111111')
    expect(res.method).toBe('DELIVERY')
  })

  it('parses products list sample', () => {
    const res = parseEcosystemExternalProducts(productsListSample)
    expect(res).toHaveLength(2)
    expect(res[0].name).toBe('Product Alpha')
  })

  it('parses product sample', () => {
    const res = parseEcosystemExternalProduct(productSample)
    expect(res.id).toBe('p3333333-3333-3333-3333-333333333333')
    expect(res.deliverySupported).toBe(true)
  })

  it('parses analytics summary sample', () => {
    const res = parseEcosystemAnalyticsSummary(analyticsSummarySample)
    expect(res.totalOrders).toBe(20)
    expect(res.ordersByStatus.PENDING_PAYMENT).toBe(5)
    expect(res.fulfillmentsByStatus.DISPATCHED).toBe(4)
    expect(res.activeExternalProducts).toBe(14)
  })

  it('parses operational report sample', () => {
    const res = parseEcosystemOperationalReport(analyticsReportSample)
    expect(res.rangeKey).toBe('7d')
    expect(res.periodMetrics.paymentsConfirmed).toBe(5)
    expect(res.currentSnapshot.fulfillmentsByStatus.DELIVERED).toBe(5)
  })

  it('parses promotion sample', () => {
    const res = parseEcosystemPromotion(promotionSample)
    expect(res.code).toBe('BIENVENIDA10')
    expect(res.type).toBe('PERCENTAGE')
    expect(res.usageCount).toBe(3)
  })
})
