import { describe, expect, it } from 'vitest'
import productSample from '../_samples/store.admin.product.json'
import productsListSample from '../_samples/store.admin.products.list.json'
import categorySample from '../_samples/store.admin.category.json'
import categoriesListSample from '../_samples/store.admin.categories.list.json'
import analyticsSummarySample from '../_samples/store.analytics.summary.json'
import analyticsReportSample from '../_samples/store.analytics.report.json'
import productAnalyticsSample from '../_samples/store.analytics.products.json'
import commerceAnalyticsSample from '../_samples/store.analytics.commerce.json'
import funnelAnalyticsSample from '../_samples/store.analytics.funnel.json'
import zonesListSample from '../_samples/store.admin.shipping.zones.list.json'
import zoneSample from '../_samples/store.admin.shipping.zone.json'
import promotionSample from '../_samples/store.admin.promotion.json'
import discoverySample from '../_samples/store.admin.discovery.json'
import capabilitiesSample from '../_samples/store.admin.capabilities.json'
import readinessSample from '../_samples/store.admin.readiness.json'
import {
  parseStoreAdminProduct,
  parseStoreAdminProducts,
  parseStoreAdminDiscoverySettings,
  parseStoreCategory,
  parseStoreCategories,
  parseStorePromotion,
  parseStoreOperationalReport,
  parseStoreProductAnalytics,
  parseStoreCommerceAnalytics,
  parseStoreFunnelAnalytics,
  parseStoreAnalyticsSummary,
  parseStoreShippingZone,
  parseStoreShippingZones,
  parseStoreCapabilities,
  parseStoreReadiness
} from '../../../adapters/storeAdminAdapter'

describe('store admin contracts parsing', () => {
  it('parses products list sample', () => {
    const res = parseStoreAdminProducts(productsListSample)
    expect(res).toHaveLength(2)
    expect(res[0].sku).toBe('SKU-CAFE')
    expect(res[0].stockQuantity).toBe(25)
    expect(res[0].categoryName).toBe('Bebidas')
    expect(res[1].isActive).toBe(false)
    expect(res[1].isAvailable).toBe(false)
  })

  it('parses product sample', () => {
    const res = parseStoreAdminProduct(productSample)
    expect(res.id).toBe('11111111-1111-1111-1111-111111111111')
    expect(res.priceCents).toBe(1500)
    expect(res.stockQuantity).toBe(25)
    expect(res.categoryId).toBe('44444444-4444-4444-4444-444444444444')
  })

  it('parses categories list sample', () => {
    const res = parseStoreCategories(categoriesListSample)
    expect(res).toHaveLength(2)
    expect(res[0].name).toBe('Bebidas')
    expect(res[1].active).toBe(false)
  })

  it('parses category sample', () => {
    const res = parseStoreCategory(categorySample)
    expect(res.id).toBe('44444444-4444-4444-4444-444444444444')
    expect(res.sortOrder).toBe(10)
  })

  it('parses analytics summary sample', () => {
    const res = parseStoreAnalyticsSummary(analyticsSummarySample)
    expect(res.totalOrders).toBe(12)
    expect(res.ordersByStatus.PAID).toBe(6)
    expect(res.fulfillmentsByStatus.DELIVERED).toBe(3)
    expect(res.activeProducts).toBe(8)
  })

  it('parses operational report sample', () => {
    const res = parseStoreOperationalReport(analyticsReportSample)
    expect(res.rangeKey).toBe('7d')
    expect(res.periodMetrics.ordersCreated).toBe(9)
    expect(res.periodMetrics.paymentsConfirmed).toBe(5)
    expect(res.periodMetrics.stockConflicts).toBe(2)
    expect(res.currentSnapshot.fulfillmentsByStatus.DISPATCHED).toBe(2)
  })

  it('parses product analytics sample', () => {
    const res = parseStoreProductAnalytics(productAnalyticsSample)
    expect(res.rangeKey).toBe('7d')
    expect(res.totals.detailViews).toBe(3)
    expect(res.totals.ctrPercent).toBe(60)
    expect(res.products[0].productSlug).toBe('apple')
    expect(res.products[0].addToCartRatePercent).toBe(50)
  })

  it('parses commerce analytics sample', () => {
    const res = parseStoreCommerceAnalytics(commerceAnalyticsSample)
    expect(res.orders).toBe(120)
    expect(res.revenueCents).toBe(850000)
    expect(res.averageOrderValueCents).toBe(7083)
    expect(res.productsSold).toBe(340)
    expect(res.topProducts[0].productSlug).toBe('pan-de-campo')
    expect(res.topProducts[0].revenueCents).toBe(96000)
  })

  it('parses funnel analytics sample', () => {
    const res = parseStoreFunnelAnalytics(funnelAnalyticsSample)
    expect(res.listViews).toBe(1000)
    expect(res.cardClicks).toBe(400)
    expect(res.detailViews).toBe(320)
    expect(res.addToCart).toBe(80)
    expect(res.orders).toBe(25)
    expect(res.revenueCents).toBe(150000)
    expect(res.clickRate).toBe(0.4)
    expect(res.detailRate).toBe(0.8)
    expect(res.addToCartRate).toBe(0.25)
    expect(res.purchaseRate).toBe(0.3125)
  })

  it('parses operational report legacy alias ordersPaid as paymentsConfirmed', () => {
    const legacyOnly = {
      ...analyticsReportSample,
      periodMetrics: {
        ...analyticsReportSample.periodMetrics,
        paymentsConfirmed: undefined,
        ordersPaid: 7
      }
    }
    const res = parseStoreOperationalReport(legacyOnly)
    expect(res.periodMetrics.paymentsConfirmed).toBe(7)
    expect(res.periodMetrics.ordersPaid).toBe(7)
  })

  it('parses shipping zones list sample', () => {
    const res = parseStoreShippingZones(zonesListSample)
    expect(res).toHaveLength(2)
    expect(res[0].type).toBe('EXACT')
    expect(res[1].type).toBe('RANGE')
  })

  it('parses shipping zone sample', () => {
    const res = parseStoreShippingZone(zoneSample)
    expect(res.zoneId).toBe('e3333333-3333-3333-3333-333333333333')
    expect(res.postalCode).toBe('1900')
  })

  it('parses promotion sample', () => {
    const res = parseStorePromotion(promotionSample)
    expect(res.code).toBe('BIENVENIDA10')
    expect(res.type).toBe('PERCENTAGE')
    expect(res.usageCount).toBe(4)
  })

  it('parses discovery settings sample', () => {
    const res = parseStoreAdminDiscoverySettings(discoverySample)
    expect(res.storeSlug).toBe('demo-store')
    expect(res.actorRole).toBe('OWNER')
    expect(res.ecosystem?.slug).toBe('demo-ecosystem')
    expect(res.publicCategoryKey).toBe('cafeteria')
    expect(res.categories).toHaveLength(3)
  })

  it('parses store capabilities sample', () => {
    const res = parseStoreCapabilities(capabilitiesSample)
    expect(res.enabled).toEqual(['ABOUT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT', 'CONTACT'])
    expect(res.available).toHaveLength(9)
    expect(res.available[0].key).toBe('ABOUT')
    expect(res.available[0].label).toBe('Sobre mí')
  })

  it('parses store readiness sample', () => {
    const res = parseStoreReadiness(readinessSample)
    expect(res.score).toBe(75)
    expect(res.publishReady).toBe(false)
    expect(res.completedSteps).toContain('store_profile')
    expect(res.blockers).toEqual(['first_product', 'shipping_setup'])
    expect(res.steps[2].ctaRoute).toBe('/admin/store/products')
  })
})
