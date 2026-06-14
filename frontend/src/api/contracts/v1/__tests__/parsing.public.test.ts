import { describe, expect, it } from 'vitest'
import ecosystemSample from '../_samples/public.ecosystem.json'
import ecosystemHomeSample from '../_samples/public.ecosystem.home.json'
import ecosystemProductsPageSample from '../_samples/public.ecosystem.products.page.json'
import ecosystemProductsSample from '../_samples/public.ecosystem.products.json'
import ecosystemStoresMapSample from '../_samples/public.ecosystem.stores-map.json'
import storeSample from '../_samples/public.store.json'
import productDetailSample from '../_samples/public.product-detail.json'
import productsSample from '../_samples/public.products.json'
import productsPageSample from '../_samples/public.products.page.json'
import { parsePublicProducts, parsePublicProductsPage, parsePublicStore, parsePublicStoreProductDetail } from '../../../adapters/publicAdapter'
import { parsePublicEcosystem, parsePublicEcosystemHome, parsePublicEcosystemProducts, parsePublicEcosystemProductsPage, parsePublicEcosystemStoresMap } from '../../../adapters/publicEcosystemAdapter'

describe('public contracts parsing', () => {
  it('parses public store sample', () => {
    const store = parsePublicStore(storeSample)
    expect(store.slug).toBe('demo-store')
    expect(store.id).toBe('11111111-1111-1111-1111-111111111111')
    expect(store.name).toBe('Demo Store')
    expect(store.categories).toHaveLength(1)
    expect(store.categories[0].name).toBe('Bebidas')
    expect(store.promotions).toHaveLength(1)
    expect(store.promotions[0].code).toBe('BIENVENIDA10')
  })

  it('parses public products sample', () => {
    const products = parsePublicProducts(productsSample)
    expect(products).toHaveLength(2)
    expect(products[0].id).toBe('22222222-2222-2222-2222-222222222222')
    expect(products[0].slug).toBe('apple')
    expect(products[0].priceCents).toBe(15000)
    expect(products[0].stockQuantity).toBe(8)
    expect(products[0].isAvailable).toBe(true)
    expect(products[0].categoryName).toBe('Bebidas')
    expect(products[1].sku).toBe('SKU-BANANA')
    expect(products[1].isAvailable).toBe(false)
  })

  it('parses public products page sample', () => {
    const page = parsePublicProductsPage(productsPageSample)
    expect(page.page).toBe(0)
    expect(page.size).toBe(20)
    expect(page.totalElements).toBe(2)
    expect(page.totalPages).toBe(1)
    expect(page.content).toHaveLength(2)
    expect(page.content[0].slug).toBe('apple')
    expect(page.content[0].sku).toBe('SKU-APPLE')
  })

  it('rejects public products without slug', () => {
    expect(() => parsePublicProducts([{ ...productsSample[0], slug: undefined }])).toThrow('Public product slug at 0 is required')
    expect(() => parsePublicProductsPage({
      ...productsPageSample,
      content: [{ ...productsPageSample.content[0], slug: undefined }]
    })).toThrow('Public product slug at 0 is required')
  })

  it('parses public store product detail sample', () => {
    const detail = parsePublicStoreProductDetail(productDetailSample)
    expect(detail.store.slug).toBe('demo-store')
    expect(detail.product.slug).toBe('pan-de-campo')
    expect(detail.product.name).toBe('Pan de campo')
    expect(detail.product.priceCents).toBe(1200)
    expect(detail.product.description).toBeNull()
    expect(JSON.stringify(detail)).not.toContain('"id"')
    expect(JSON.stringify(detail)).not.toContain('storeId')
    expect(JSON.stringify(detail)).not.toContain('categoryId')
  })

  it('rejects invalid public store product detail payloads', () => {
    expect(() => parsePublicStoreProductDetail({ ...productDetailSample, product: { ...productDetailSample.product, slug: undefined } }))
      .toThrow('Public store product detail product slug is required')
    expect(() => parsePublicStoreProductDetail({ ...productDetailSample, store: { ...productDetailSample.store, categoryName: 123 } }))
      .toThrow('Public store product detail store categoryName is invalid')
  })

  it('rejects invalid public products page payloads', () => {
    expect(() => parsePublicProductsPage(productsSample)).toThrow('Invalid public products page payload')
    expect(() => parsePublicProductsPage({ ...productsPageSample, content: {} })).toThrow('Public products page content is required')
    expect(() => parsePublicProductsPage({ ...productsPageSample, totalElements: '2' })).toThrow('Public products page totalElements is required')
  })

  it('keeps the legacy public products parser array-only', () => {
    expect(() => parsePublicProducts(productsPageSample)).toThrow('Invalid public products payload')
  })

  it('parses public ecosystem sample', () => {
    const ecosystem = parsePublicEcosystem(ecosystemSample)
    expect(ecosystem.id).toBe('33333333-3333-3333-3333-333333333333')
    expect(ecosystem.slug).toBe('demo-ecosystem')
    expect(ecosystem.name).toBe('Demo Ecosystem')
    expect(ecosystem.promotions).toHaveLength(1)
    expect(ecosystem.promotions[0].code).toBe('BIENVENIDA10')
  })

  it('parses public ecosystem products sample', () => {
    const products = parsePublicEcosystemProducts(ecosystemProductsSample)
    expect(products).toHaveLength(2)
    expect(products[0].name).toBe('External Apple')
    expect(products[0].priceAmount).toBe(150)
    expect(products[0].deliverySupported).toBe(true)
    expect(products[1].currency).toBe('ARS')
  })

  it('parses public ecosystem products page sample', () => {
    const page = parsePublicEcosystemProductsPage(ecosystemProductsPageSample)
    expect(page.page).toBe(0)
    expect(page.size).toBe(24)
    expect(page.totalElements).toBe(2)
    expect(page.totalPages).toBe(1)
    expect(page.content[0].name).toBe('External Apple')
  })

  it('keeps ecosystem products page parser compatible with legacy arrays', () => {
    const page = parsePublicEcosystemProductsPage(ecosystemProductsSample)
    expect(page.content).toHaveLength(2)
    expect(page.page).toBe(0)
    expect(page.totalElements).toBe(2)
  })

  it('rejects invalid public ecosystem products page payloads', () => {
    expect(() => parsePublicEcosystemProductsPage({ ...ecosystemProductsPageSample, content: {} })).toThrow('Public ecosystem products page content is required')
    expect(() => parsePublicEcosystemProductsPage({ ...ecosystemProductsPageSample, totalElements: '2' })).toThrow('Public ecosystem products page totalElements is required')
  })

  it('parses public ecosystem home sample', () => {
    const home = parsePublicEcosystemHome(ecosystemHomeSample)
    expect(home.ecosystem.slug).toBe('demo-ecosystem')
    expect(home.newStores).toHaveLength(2)
    expect(home.newStores[0].slug).toBe('new-store')
    expect(home.newStores[0].category?.key).toBe('almacen')
    expect(home.storeCategories[0].label).toBe('Almacen')
    expect(home.promotionProducts).toHaveLength(2)
    expect(home.deliveryProducts[0].deliverySupported).toBe(true)
  })

  it('parses public ecosystem stores map sample', () => {
    const storesMap = parsePublicEcosystemStoresMap(ecosystemStoresMapSample)
    expect(storesMap.ecosystem.slug).toBe('demo-ecosystem')
    expect(storesMap.categories).toHaveLength(3)
    expect(storesMap.stores).toHaveLength(3)
    expect(storesMap.stores[0].slug).toBe('demo-store')
    expect(storesMap.stores[0].category?.key).toBe('cafeteria')
    expect(storesMap.stores[0].locationLabel).toBe('La Plata Centro')
    expect(storesMap.stores[0].latitude).toBe(-34.920494)
    expect(storesMap.stores[1].hasPublicLocation).toBe(false)
    expect(storesMap.stores[1].latitude).toBeNull()
  })
})
