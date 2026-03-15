import { requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type {
  EcosystemExternalProduct,
  EcosystemExternalProductCreateReq,
  EcosystemExternalProductUpdateReq,
  EcosystemShippingZone,
  EcosystemShippingZoneCreateReq,
  EcosystemShippingZoneType
} from '../contracts/v1/ecosystemAdmin'
import { assertArray, assertNumber, assertRecord, assertString } from './validators'

function assertBoolean(value: unknown, message: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(message)
}

function assertNullableString(value: unknown, message: string): asserts value is string | null {
  if (value === null) return
  if (typeof value !== 'string') throw new Error(message)
}

function assertNullableNumber(value: unknown, message: string): asserts value is number | null {
  if (value === null) return
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(message)
}

function parseShippingZoneType(value: unknown, message: string): EcosystemShippingZoneType {
  if (value === 'EXACT' || value === 'RANGE') return value
  throw new Error(message)
}

export function parseEcosystemExternalProduct(data: unknown): EcosystemExternalProduct {
  assertRecord(data, 'Invalid ecosystem external product payload')
  assertString(data.id, 'Ecosystem external product id is required')
  assertString(data.ecosystemId, 'Ecosystem external product ecosystemId is required')
  assertString(data.name, 'Ecosystem external product name is required')
  assertNumber(data.priceAmount, 'Ecosystem external product priceAmount is required')
  assertString(data.currency, 'Ecosystem external product currency is required')
  assertBoolean(data.deliverySupported, 'Ecosystem external product deliverySupported is required')
  assertBoolean(data.isActive, 'Ecosystem external product isActive is required')
  assertString(data.createdAt, 'Ecosystem external product createdAt is required')
  return {
    id: data.id,
    ecosystemId: data.ecosystemId,
    name: data.name,
    priceAmount: data.priceAmount,
    currency: data.currency,
    deliverySupported: data.deliverySupported,
    isActive: data.isActive,
    createdAt: data.createdAt
  }
}

export function parseEcosystemExternalProducts(data: unknown): EcosystemExternalProduct[] {
  assertArray(data, 'Invalid ecosystem external products payload')
  return data.map((item, index) => parseEcosystemExternalProductWithIndex(item, index))
}

export function parseEcosystemShippingZone(data: unknown): EcosystemShippingZone {
  assertRecord(data, 'Invalid ecosystem shipping zone payload')
  assertString(data.zoneId, 'Ecosystem shipping zone zoneId is required')
  assertString(data.ecosystemId, 'Ecosystem shipping zone ecosystemId is required')
  const type = parseShippingZoneType(data.type, 'Ecosystem shipping zone type is required')
  assertNullableString(data.postalCode, 'Ecosystem shipping zone postalCode is invalid')
  assertNullableNumber(data.rangeStart, 'Ecosystem shipping zone rangeStart is invalid')
  assertNullableNumber(data.rangeEnd, 'Ecosystem shipping zone rangeEnd is invalid')
  assertNumber(data.costAmount, 'Ecosystem shipping zone costAmount is required')
  assertString(data.currency, 'Ecosystem shipping zone currency is required')
  assertBoolean(data.isActive, 'Ecosystem shipping zone isActive is required')
  assertString(data.createdAt, 'Ecosystem shipping zone createdAt is required')

  if (type === 'EXACT' && data.postalCode === null) {
    throw new Error('Ecosystem shipping zone postalCode is required for EXACT')
  }
  if (type === 'RANGE' && (data.rangeStart === null || data.rangeEnd === null)) {
    throw new Error('Ecosystem shipping zone rangeStart/rangeEnd are required for RANGE')
  }

  return {
    zoneId: data.zoneId,
    ecosystemId: data.ecosystemId,
    type,
    postalCode: data.postalCode ?? null,
    rangeStart: data.rangeStart ?? null,
    rangeEnd: data.rangeEnd ?? null,
    costAmount: data.costAmount,
    currency: data.currency,
    isActive: data.isActive,
    createdAt: data.createdAt
  }
}

export function parseEcosystemShippingZones(data: unknown): EcosystemShippingZone[] {
  assertArray(data, 'Invalid ecosystem shipping zones payload')
  return data.map((item, index) => {
    try {
      return parseEcosystemShippingZone(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid ecosystem shipping zone'
      throw new Error(`Ecosystem shipping zone at ${index} is invalid: ${message}`)
    }
  })
}

function parseEcosystemExternalProductWithIndex(data: unknown, index: number): EcosystemExternalProduct {
  try {
    return parseEcosystemExternalProduct(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid ecosystem external product'
    throw new Error(`Ecosystem external product at ${index} is invalid: ${message}`)
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const ecosystemAdminAdapter = {
  async listProducts(
    ecosystemId: string,
    auth: AuthRequestContext,
    options: { activeOnly?: boolean; query?: string } = {}
  ) {
    const qs = buildQuery({ ecosystemId, activeOnly: options.activeOnly ?? true, query: options.query })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/products${qs}`, {}, {}, auth)
    return parseEcosystemExternalProducts(data)
  },
  async createProduct(payload: EcosystemExternalProductCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/ecosystem/admin/products',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseEcosystemExternalProduct(data)
  },
  async getProduct(id: string, ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/products/${id}${qs}`, {}, {}, auth)
    return parseEcosystemExternalProduct(data)
  },
  async updateProduct(id: string, payload: EcosystemExternalProductUpdateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/ecosystem/admin/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseEcosystemExternalProduct(data)
  },
  async deleteProduct(id: string, ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/products/${id}${qs}`, { method: 'DELETE' }, {}, auth)
    return parseEcosystemExternalProduct(data)
  },
  async listShippingZones(ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    const data = await requestJsonWithAuth<unknown>(`/api/ecosystem/admin/shipping/zones${qs}`, {}, {}, auth)
    return parseEcosystemShippingZones(data)
  },
  async createShippingZone(payload: EcosystemShippingZoneCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/ecosystem/admin/shipping/zones',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseEcosystemShippingZone(data)
  },
  async deleteShippingZone(zoneId: string, ecosystemId: string, auth: AuthRequestContext) {
    const qs = buildQuery({ ecosystemId })
    await requestJsonWithAuth<unknown>(
      `/api/ecosystem/admin/shipping/zones/${zoneId}${qs}`,
      { method: 'DELETE' },
      {},
      auth
    )
  }
}
