import { requestJson } from '../client/http'
import {
  PublicProduct,
  PublicProductsPage,
  PublicStore,
  PublicStoreCapability,
  PublicStoreCatalogSort,
  PublicStoreProductDetail,
  PublicStoreCategory,
  PublicStorePromotion
} from '../contracts/v1/public'
import { assertArray, assertNumber, assertRecord, assertString } from './validators'

export const ecommerceDefaultPublicStoreCapabilities: PublicStoreCapability[] = [
  'ABOUT',
  'PRODUCTS',
  'PROMOTIONS',
  'SHIPPING',
  'CHECKOUT',
  'CONTACT'
]

const PUBLIC_STORE_CAPABILITIES = new Set<PublicStoreCapability>([
  'ABOUT',
  'GALLERY',
  'BLOG',
  'PRODUCTS',
  'RESERVATIONS',
  'PROMOTIONS',
  'SHIPPING',
  'CHECKOUT',
  'CONTACT'
])

function assertBoolean(value: unknown, message: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(message)
}

function parsePublicPromotion(data: unknown, index: number): PublicStorePromotion {
  assertRecord(data, `Public promotion at ${index} is invalid`)
  assertString(data.code, `Public promotion code at ${index} is required`)
  assertString(data.shortLabel, `Public promotion shortLabel at ${index} is required`)
  assertString(data.type, `Public promotion type at ${index} is required`)
  assertNumber(data.value, `Public promotion value at ${index} is required`)
  if (!(data.expirationDate === null || data.expirationDate === undefined || typeof data.expirationDate === 'string')) {
    throw new Error(`Public promotion expirationDate at ${index} is invalid`)
  }
  if (data.type !== 'FIXED' && data.type !== 'PERCENTAGE') {
    throw new Error(`Public promotion type at ${index} is invalid`)
  }
  return {
    code: data.code,
    type: data.type,
    value: data.value,
    shortLabel: data.shortLabel,
    expirationDate: data.expirationDate ?? null
  }
}

function parsePublicCategory(data: unknown, index: number): PublicStoreCategory {
  assertRecord(data, `Public category at ${index} is invalid`)
  assertString(data.id, `Public category id at ${index} is required`)
  assertString(data.name, `Public category name at ${index} is required`)
  assertNumber(data.sortOrder, `Public category sortOrder at ${index} is required`)
  return {
    id: data.id,
    name: data.name,
    sortOrder: data.sortOrder
  }
}

function parsePublicStoreCapabilities(data: unknown, message: string): PublicStoreCapability[] {
  if (data === undefined || data === null) return ecommerceDefaultPublicStoreCapabilities
  assertArray(data, message)
  return data.map((item, index) => {
    assertString(item, `${message} at ${index} is invalid`)
    const normalized = item.trim().toUpperCase() as PublicStoreCapability
    if (!PUBLIC_STORE_CAPABILITIES.has(normalized)) {
      throw new Error(`${message} at ${index} is invalid`)
    }
    return normalized
  })
}

export function hasPublicStoreCapability(
  capabilities: PublicStoreCapability[] | undefined | null,
  capability: PublicStoreCapability
) {
  return (capabilities ?? ecommerceDefaultPublicStoreCapabilities).includes(capability)
}

export function parsePublicStore(data: unknown): PublicStore {
  assertRecord(data, 'Invalid public store payload')
  assertString(data.slug, 'Public store slug is required')
  assertString(data.id, 'Public store id is required')
  assertString(data.name, 'Public store name is required')
  if (!(data.promotions === undefined || Array.isArray(data.promotions))) {
    throw new Error('Public store promotions are invalid')
  }
  if (!(data.categories === undefined || Array.isArray(data.categories))) {
    throw new Error('Public store categories are invalid')
  }
  return {
    slug: data.slug,
    id: data.id,
    name: data.name,
    capabilities: parsePublicStoreCapabilities(data.capabilities, 'Public store capabilities'),
    categories: (data.categories ?? []).map((item, index) => parsePublicCategory(item, index)),
    promotions: (data.promotions ?? []).map((item, index) => parsePublicPromotion(item, index))
  }
}

export function parsePublicProducts(data: unknown): PublicProduct[] {
  assertArray(data, 'Invalid public products payload')
  return data.map((item, index) => parsePublicProduct(item, index))
}

function parsePublicProduct(item: unknown, index: number): PublicProduct {
  assertRecord(item, `Public product at ${index} is invalid`)
  assertNumber(item.priceCents, `Public product priceCents at ${index} is required`)
  assertString(item.id, `Public product id at ${index} is required`)
  assertString(item.slug, `Public product slug at ${index} is required`)
  assertString(item.name, `Public product name at ${index} is required`)
  assertString(item.sku, `Public product sku at ${index} is required`)
  assertNumber(item.stockQuantity, `Public product stockQuantity at ${index} is required`)
  assertBoolean(item.isAvailable, `Public product isAvailable at ${index} is required`)
  if (!(item.categoryId === null || item.categoryId === undefined || typeof item.categoryId === 'string')) {
    throw new Error(`Public product categoryId at ${index} is invalid`)
  }
  if (!(item.categoryName === null || item.categoryName === undefined || typeof item.categoryName === 'string')) {
    throw new Error(`Public product categoryName at ${index} is invalid`)
  }
  return {
    priceCents: item.priceCents,
    id: item.id,
    slug: item.slug,
    name: item.name,
    sku: item.sku,
    stockQuantity: item.stockQuantity,
    isAvailable: item.isAvailable,
    categoryId: item.categoryId ?? null,
    categoryName: item.categoryName ?? null
  }
}

export function parsePublicStoreProductDetail(data: unknown): PublicStoreProductDetail {
  assertRecord(data, 'Invalid public store product detail payload')
  assertRecord(data.store, 'Public store product detail store is required')
  assertRecord(data.product, 'Public store product detail product is required')

  const { store, product } = data
  assertString(store.slug, 'Public store product detail store slug is required')
  assertString(store.name, 'Public store product detail store name is required')
  if (!(store.categoryName === null || store.categoryName === undefined || typeof store.categoryName === 'string')) {
    throw new Error('Public store product detail store categoryName is invalid')
  }

  assertString(product.slug, 'Public store product detail product slug is required')
  assertString(product.name, 'Public store product detail product name is required')
  assertNumber(product.priceCents, 'Public store product detail product priceCents is required')
  assertString(product.currency, 'Public store product detail product currency is required')
  assertBoolean(product.isAvailable, 'Public store product detail product isAvailable is required')
  assertNumber(product.stockQuantity, 'Public store product detail product stockQuantity is required')
  if (!(product.categoryName === null || product.categoryName === undefined || typeof product.categoryName === 'string')) {
    throw new Error('Public store product detail product categoryName is invalid')
  }
  if (!(product.description === null || product.description === undefined || typeof product.description === 'string')) {
    throw new Error('Public store product detail product description is invalid')
  }
  if (!(product.imageUrl === null || product.imageUrl === undefined || typeof product.imageUrl === 'string')) {
    throw new Error('Public store product detail product imageUrl is invalid')
  }
  if (!(product.sku === null || product.sku === undefined || typeof product.sku === 'string')) {
    throw new Error('Public store product detail product sku is invalid')
  }

  return {
    store: {
      slug: store.slug,
      name: store.name,
      categoryName: store.categoryName ?? null,
      capabilities: parsePublicStoreCapabilities(store.capabilities, 'Public store product detail store capabilities')
    },
    product: {
      slug: product.slug,
      name: product.name,
      priceCents: product.priceCents,
      currency: product.currency,
      isAvailable: product.isAvailable,
      stockQuantity: product.stockQuantity,
      categoryName: product.categoryName ?? null,
      description: product.description ?? null,
      imageUrl: product.imageUrl ?? null,
      sku: product.sku ?? null
    }
  }
}

export function parsePublicProductsPage(data: unknown): PublicProductsPage {
  assertRecord(data, 'Invalid public products page payload')
  assertNumber(data.page, 'Public products page page is required')
  assertNumber(data.size, 'Public products page size is required')
  assertNumber(data.totalElements, 'Public products page totalElements is required')
  assertNumber(data.totalPages, 'Public products page totalPages is required')
  assertArray(data.content, 'Public products page content is required')
  return {
    content: data.content.map((item, index) => parsePublicProduct(item, index)),
    page: data.page,
    size: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages
  }
}

type PublicStoreProductsOptions = {
  q?: string
  availableOnly?: boolean
  sort?: PublicStoreCatalogSort
  categoryId?: string
}

function buildPublicStoreProductsQuery(options: PublicStoreProductsOptions = {}) {
  const params = new URLSearchParams()
  if (options.q?.trim()) params.set('q', options.q.trim())
  if (options.availableOnly) params.set('availableOnly', 'true')
  if (options.sort && options.sort !== 'default') params.set('sort', options.sort)
  if (options.categoryId) params.set('categoryId', options.categoryId)
  return params
}

export const publicAdapter = {
  async getStore(slug: string) {
    const data = await requestJson<unknown>(`/api/public/stores/${slug}`)
    return parsePublicStore(data)
  },
  async getProducts(
    slug: string,
    options: PublicStoreProductsOptions = {}
  ) {
    const params = buildPublicStoreProductsQuery(options)
    const query = params.toString()
    const data = await requestJson<unknown>(`/api/public/stores/${slug}/products${query ? `?${query}` : ''}`)
    return parsePublicProducts(data)
  },
  async getProductsPage(
    slug: string,
    options: PublicStoreProductsOptions = {},
    page = 0,
    size = 20
  ) {
    const params = buildPublicStoreProductsQuery(options)
    params.set('page', String(page))
    params.set('size', String(size))
    const data = await requestJson<unknown>(`/api/public/stores/${slug}/products?${params.toString()}`)
    return parsePublicProductsPage(data)
  },
  async getProductDetail(storeSlug: string, productSlug: string) {
    const data = await requestJson<unknown>(`/api/public/stores/${storeSlug}/products/${productSlug}`)
    return parsePublicStoreProductDetail(data)
  }
}
