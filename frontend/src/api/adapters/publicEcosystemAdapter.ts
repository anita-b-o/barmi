import { requestJson } from '../client/http'
import type { PublicEcosystem, PublicEcosystemProduct } from '../contracts/v1/public'
import { assertArray, assertBoolean, assertNumber, assertRecord, assertString } from './validators'

export function parsePublicEcosystem(data: unknown): PublicEcosystem {
  assertRecord(data, 'Invalid public ecosystem payload')
  assertString(data.id, 'Public ecosystem id is required')
  assertString(data.slug, 'Public ecosystem slug is required')
  assertString(data.name, 'Public ecosystem name is required')
  return {
    id: data.id,
    slug: data.slug,
    name: data.name
  }
}

export function parsePublicEcosystemProducts(data: unknown): PublicEcosystemProduct[] {
  assertArray(data, 'Invalid public ecosystem products payload')
  return data.map((item, index) => {
    assertRecord(item, `Public ecosystem product at ${index} is invalid`)
    assertString(item.id, `Public ecosystem product id at ${index} is required`)
    assertString(item.name, `Public ecosystem product name at ${index} is required`)
    assertNumber(item.priceAmount, `Public ecosystem product priceAmount at ${index} is required`)
    assertString(item.currency, `Public ecosystem product currency at ${index} is required`)
    assertBoolean(item.deliverySupported, `Public ecosystem product deliverySupported at ${index} is required`)
    return {
      id: item.id,
      name: item.name,
      priceAmount: item.priceAmount,
      currency: item.currency,
      deliverySupported: item.deliverySupported
    }
  })
}

export const publicEcosystemAdapter = {
  async getEcosystem(slug: string) {
    const data = await requestJson<unknown>(`/api/public/ecosystems/${slug}`)
    return parsePublicEcosystem(data)
  },
  async listProducts(slug: string, options: { query?: string; activeOnly?: boolean } = {}) {
    const params = new URLSearchParams()
    if (options.query?.trim()) params.set('query', options.query.trim())
    params.set('activeOnly', String(options.activeOnly ?? true))
    const queryString = params.toString()
    const path = queryString
      ? `/api/public/ecosystems/${slug}/products?${queryString}`
      : `/api/public/ecosystems/${slug}/products`
    const data = await requestJson<unknown>(path)
    return parsePublicEcosystemProducts(data)
  }
}
