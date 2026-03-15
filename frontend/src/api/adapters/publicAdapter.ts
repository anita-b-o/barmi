import { requestJson } from '../client/http'
import { PublicProduct, PublicStore } from '../contracts/v1/public'
import { assertArray, assertNumber, assertRecord, assertString } from './validators'

export function parsePublicStore(data: unknown): PublicStore {
  assertRecord(data, 'Invalid public store payload')
  assertString(data.slug, 'Public store slug is required')
  assertString(data.id, 'Public store id is required')
  assertString(data.name, 'Public store name is required')
  return {
    slug: data.slug,
    id: data.id,
    name: data.name
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
    return {
      priceCents: item.priceCents,
      id: item.id,
      name: item.name,
      sku: item.sku
    }
  })
}

export const publicAdapter = {
  async getStore(slug: string) {
    const data = await requestJson<unknown>(`/api/public/stores/${slug}`)
    return parsePublicStore(data)
  },
  async getProducts(slug: string) {
    const data = await requestJson<unknown>(`/api/public/stores/${slug}/products`)
    return parsePublicProducts(data)
  }
}
