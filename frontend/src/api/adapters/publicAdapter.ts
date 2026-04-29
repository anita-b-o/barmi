import { requestJson } from '../client/http'
import { PublicProduct, PublicStore, PublicStoreCatalogSort, PublicStoreCategory, PublicStorePromotion } from '../contracts/v1/public'
import { assertArray, assertNumber, assertRecord, assertString } from './validators'

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
    categories: (data.categories ?? []).map((item, index) => parsePublicCategory(item, index)),
    promotions: (data.promotions ?? []).map((item, index) => parsePublicPromotion(item, index))
  }
}

export function parsePublicProducts(data: unknown): PublicProduct[] {
  assertArray(data, 'Invalid public products payload')
  return data.map((item, index) => {
    assertRecord(item, `Public product at ${index} is invalid`)
    assertNumber(item.priceCents, `Public product priceCents at ${index} is required`)
    assertString(item.id, `Public product id at ${index} is required`)
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
      name: item.name,
      sku: item.sku,
      stockQuantity: item.stockQuantity,
      isAvailable: item.isAvailable,
      categoryId: item.categoryId ?? null,
      categoryName: item.categoryName ?? null
    }
  })
}

export const publicAdapter = {
  async getStore(slug: string) {
    const data = await requestJson<unknown>(`/api/public/stores/${slug}`)
    return parsePublicStore(data)
  },
  async getProducts(
    slug: string,
    options: {
      q?: string
      availableOnly?: boolean
      sort?: PublicStoreCatalogSort
      categoryId?: string
    } = {}
  ) {
    const params = new URLSearchParams()
    if (options.q?.trim()) params.set('q', options.q.trim())
    if (options.availableOnly) params.set('availableOnly', 'true')
    if (options.sort && options.sort !== 'default') params.set('sort', options.sort)
    if (options.categoryId) params.set('categoryId', options.categoryId)
    const query = params.toString()
    const data = await requestJson<unknown>(`/api/public/stores/${slug}/products${query ? `?${query}` : ''}`)
    return parsePublicProducts(data)
  }
}
