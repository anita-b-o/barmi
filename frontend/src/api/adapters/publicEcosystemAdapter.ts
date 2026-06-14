import { requestJson } from '../client/http'
import type {
  PublicEcosystem,
  PublicEcosystemCatalogSort,
  PublicEcosystemHome,
  PublicEcosystemProduct,
  PublicEcosystemProductsPage,
  PublicEcosystemPromotion,
  PublicEcosystemStoresMapLocationFilter,
  PublicEcosystemStoresMapSort,
  PublicEcosystemStoresMap,
  PublicStoreMapStore,
  PublicStoreCategoryFacet,
  PublicStoreCategorySummary,
  PublicStoreSummary
} from '../contracts/v1/public'
import { assertArray, assertBoolean, assertNumber, assertRecord, assertString } from './validators'

function parsePublicEcosystemPromotion(data: unknown, index: number): PublicEcosystemPromotion {
  assertRecord(data, `Public ecosystem promotion at ${index} is invalid`)
  assertString(data.code, `Public ecosystem promotion code at ${index} is required`)
  assertString(data.type, `Public ecosystem promotion type at ${index} is required`)
  assertNumber(data.value, `Public ecosystem promotion value at ${index} is required`)
  assertString(data.shortLabel, `Public ecosystem promotion shortLabel at ${index} is required`)
  if (!(data.expirationDate === null || typeof data.expirationDate === 'string')) {
    throw new Error(`Public ecosystem promotion expirationDate at ${index} is invalid`)
  }
  return {
    code: data.code,
    type: data.type as PublicEcosystemPromotion['type'],
    value: data.value,
    shortLabel: data.shortLabel,
    expirationDate: data.expirationDate ?? null
  }
}

export function parsePublicEcosystem(data: unknown): PublicEcosystem {
  assertRecord(data, 'Invalid public ecosystem payload')
  assertString(data.id, 'Public ecosystem id is required')
  assertString(data.slug, 'Public ecosystem slug is required')
  assertString(data.name, 'Public ecosystem name is required')
  const promotions = data.promotions === undefined ? [] : data.promotions
  assertArray(promotions, 'Public ecosystem promotions are invalid')
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    promotions: promotions.map((item, index) => parsePublicEcosystemPromotion(item, index))
  }
}

function parsePublicEcosystemProduct(data: unknown, index: number): PublicEcosystemProduct {
  assertRecord(data, `Public ecosystem product at ${index} is invalid`)
  assertString(data.id, `Public ecosystem product id at ${index} is required`)
  assertString(data.name, `Public ecosystem product name at ${index} is required`)
  assertNumber(data.priceAmount, `Public ecosystem product priceAmount at ${index} is required`)
  assertString(data.currency, `Public ecosystem product currency at ${index} is required`)
  assertBoolean(data.deliverySupported, `Public ecosystem product deliverySupported at ${index} is required`)
  return {
    id: data.id,
    name: data.name,
    priceAmount: data.priceAmount,
    currency: data.currency,
    deliverySupported: data.deliverySupported
  }
}

export function parsePublicEcosystemProducts(data: unknown): PublicEcosystemProduct[] {
  assertArray(data, 'Invalid public ecosystem products payload')
  return data.map((item, index) => parsePublicEcosystemProduct(item, index))
}

export function parsePublicEcosystemProductsPage(data: unknown): PublicEcosystemProductsPage {
  if (Array.isArray(data)) {
    const content = parsePublicEcosystemProducts(data)
    return {
      content,
      page: 0,
      size: content.length,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0
    }
  }

  assertRecord(data, 'Invalid public ecosystem products page payload')
  assertArray(data.content, 'Public ecosystem products page content is required')
  assertNumber(data.page, 'Public ecosystem products page page is required')
  assertNumber(data.size, 'Public ecosystem products page size is required')
  assertNumber(data.totalElements, 'Public ecosystem products page totalElements is required')
  assertNumber(data.totalPages, 'Public ecosystem products page totalPages is required')
  return {
    content: data.content.map((item, index) => parsePublicEcosystemProduct(item, index)),
    page: data.page,
    size: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages
  }
}

function parsePublicStoreSummary(data: unknown, index: number): PublicStoreSummary {
  assertRecord(data, `Public store summary at ${index} is invalid`)
  assertString(data.id, `Public store summary id at ${index} is required`)
  assertString(data.slug, `Public store summary slug at ${index} is required`)
  assertString(data.name, `Public store summary name at ${index} is required`)
  assertString(data.createdAt, `Public store summary createdAt at ${index} is required`)
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category === undefined || data.category === null ? null : parsePublicStoreCategorySummary(data.category, `Public store summary category at ${index} is invalid`),
    createdAt: data.createdAt
  }
}

function parsePublicStoreCategorySummary(data: unknown, errorPrefix: string): PublicStoreCategorySummary {
  assertRecord(data, errorPrefix)
  assertString(data.key, `${errorPrefix}: key is required`)
  assertString(data.label, `${errorPrefix}: label is required`)
  return {
    key: data.key,
    label: data.label
  }
}

function parsePublicStoreCategoryFacet(data: unknown, index: number): PublicStoreCategoryFacet {
  assertRecord(data, `Public store category facet at ${index} is invalid`)
  assertString(data.key, `Public store category facet key at ${index} is required`)
  assertString(data.label, `Public store category facet label at ${index} is required`)
  assertNumber(data.storeCount, `Public store category facet storeCount at ${index} is required`)
  return {
    key: data.key,
    label: data.label,
    storeCount: data.storeCount
  }
}

function parsePublicStoreMapStore(data: unknown, index: number): PublicStoreMapStore {
  assertRecord(data, `Public store map store at ${index} is invalid`)
  assertString(data.id, `Public store map store id at ${index} is required`)
  assertString(data.slug, `Public store map store slug at ${index} is required`)
  assertString(data.name, `Public store map store name at ${index} is required`)
  assertBoolean(data.hasPublicLocation, `Public store map store hasPublicLocation at ${index} is required`)
  if (!(data.locationLabel === null || typeof data.locationLabel === 'string')) {
    throw new Error(`Public store map store locationLabel at ${index} is invalid`)
  }
  if (!(data.latitude === null || typeof data.latitude === 'number')) {
    throw new Error(`Public store map store latitude at ${index} is invalid`)
  }
  if (!(data.longitude === null || typeof data.longitude === 'number')) {
    throw new Error(`Public store map store longitude at ${index} is invalid`)
  }
  assertString(data.createdAt, `Public store map store createdAt at ${index} is required`)
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category === undefined || data.category === null ? null : parsePublicStoreCategorySummary(data.category, `Public store map store category at ${index} is invalid`),
    hasPublicLocation: data.hasPublicLocation,
    locationLabel: data.locationLabel ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    createdAt: data.createdAt
  }
}

export function parsePublicEcosystemHome(data: unknown): PublicEcosystemHome {
  assertRecord(data, 'Invalid public ecosystem home payload')
  const ecosystem = parsePublicEcosystem(data.ecosystem)
  const newStores = data.newStores === undefined ? [] : data.newStores
  const storeCategories = data.storeCategories === undefined ? [] : data.storeCategories
  const promotionProducts = data.promotionProducts === undefined ? [] : data.promotionProducts
  const deliveryProducts = data.deliveryProducts === undefined ? [] : data.deliveryProducts
  assertArray(newStores, 'Public ecosystem home newStores are invalid')
  assertArray(storeCategories, 'Public ecosystem home storeCategories are invalid')
  assertArray(promotionProducts, 'Public ecosystem home promotionProducts are invalid')
  assertArray(deliveryProducts, 'Public ecosystem home deliveryProducts are invalid')
  return {
    ecosystem,
    newStores: newStores.map((item, index) => parsePublicStoreSummary(item, index)),
    storeCategories: storeCategories.map((item, index) => parsePublicStoreCategoryFacet(item, index)),
    promotionProducts: parsePublicEcosystemProducts(promotionProducts),
    deliveryProducts: parsePublicEcosystemProducts(deliveryProducts)
  }
}

export function parsePublicEcosystemStoresMap(data: unknown): PublicEcosystemStoresMap {
  assertRecord(data, 'Invalid public ecosystem stores map payload')
  const ecosystem = parsePublicEcosystem(data.ecosystem)
  const categories = data.categories === undefined ? [] : data.categories
  const stores = data.stores === undefined ? [] : data.stores
  assertArray(categories, 'Public ecosystem stores map categories are invalid')
  assertArray(stores, 'Public ecosystem stores map stores are invalid')
  return {
    ecosystem,
    categories: categories.map((item, index) => parsePublicStoreCategoryFacet(item, index)),
    stores: stores.map((item, index) => parsePublicStoreMapStore(item, index))
  }
}

export const publicEcosystemAdapter = {
  async getEcosystem(slug: string) {
    const data = await requestJson<unknown>(`/api/public/ecosystems/${slug}`)
    return parsePublicEcosystem(data)
  },
  async getHome(slug: string) {
    const data = await requestJson<unknown>(`/api/public/ecosystems/${slug}/home`)
    return parsePublicEcosystemHome(data)
  },
  async getStoresMap(
    slug: string,
    options: {
      query?: string
      category?: string
      location?: PublicEcosystemStoresMapLocationFilter
      sort?: PublicEcosystemStoresMapSort
    } = {}
  ) {
    const params = new URLSearchParams()
    if (options.query?.trim()) params.set('q', options.query.trim())
    if (options.category?.trim()) params.set('category', options.category.trim())
    if (options.location && options.location !== 'mapped') params.set('location', options.location)
    if (options.sort && options.sort !== 'name,asc') params.set('sort', options.sort)
    const queryString = params.toString()
    const path = queryString
      ? `/api/public/ecosystems/${slug}/stores/map?${queryString}`
      : `/api/public/ecosystems/${slug}/stores/map`
    const data = await requestJson<unknown>(path)
    return parsePublicEcosystemStoresMap(data)
  },
  async listProducts(
    slug: string,
    options: {
      query?: string
      activeOnly?: boolean
      sort?: PublicEcosystemCatalogSort
      deliverySupported?: boolean
      page?: number
      size?: number
    } = {}
  ) {
    const params = new URLSearchParams()
    if (options.query?.trim()) params.set('q', options.query.trim())
    params.set('activeOnly', String(options.activeOnly ?? true))
    params.set('page', String(options.page ?? 0))
    params.set('size', String(options.size ?? 24))
    if (options.sort && options.sort !== 'default') params.set('sort', options.sort)
    if (options.deliverySupported !== undefined) params.set('deliverySupported', String(options.deliverySupported))
    const queryString = params.toString()
    const path = queryString
      ? `/api/public/ecosystems/${slug}/products?${queryString}`
      : `/api/public/ecosystems/${slug}/products`
    const data = await requestJson<unknown>(path)
    return parsePublicEcosystemProductsPage(data)
  }
}
