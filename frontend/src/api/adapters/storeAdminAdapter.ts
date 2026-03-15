import { requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type { StoreShippingZone, StoreShippingZoneCreateReq, StoreShippingZoneType } from '../contracts/v1/storeAdmin'
import { assertArray, assertNumber, assertRecord, assertString } from './validators'

function assertNullableString(value: unknown, message: string): asserts value is string | null {
  if (value === null) return
  if (typeof value !== 'string') throw new Error(message)
}

function assertNullableNumber(value: unknown, message: string): asserts value is number | null {
  if (value === null) return
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(message)
}

function parseType(value: unknown, message: string): StoreShippingZoneType {
  if (value === 'EXACT' || value === 'RANGE') return value
  throw new Error(message)
}

export function parseStoreShippingZone(data: unknown): StoreShippingZone {
  assertRecord(data, 'Invalid store shipping zone payload')
  assertString(data.zoneId, 'Store shipping zone zoneId is required')
  assertString(data.storeId, 'Store shipping zone storeId is required')
  const type = parseType(data.type, 'Store shipping zone type is required')
  assertNullableString(data.postalCode, 'Store shipping zone postalCode is invalid')
  assertNullableNumber(data.rangeStart, 'Store shipping zone rangeStart is invalid')
  assertNullableNumber(data.rangeEnd, 'Store shipping zone rangeEnd is invalid')
  assertNumber(data.costAmount, 'Store shipping zone costAmount is required')
  assertString(data.currency, 'Store shipping zone currency is required')
  assertString(data.createdAt, 'Store shipping zone createdAt is required')

  if (type === 'EXACT' && data.postalCode === null) {
    throw new Error('Store shipping zone postalCode is required for EXACT')
  }
  if (type === 'RANGE') {
    if (data.rangeStart === null || data.rangeEnd === null) {
      throw new Error('Store shipping zone rangeStart/rangeEnd are required for RANGE')
    }
  }

  return {
    zoneId: data.zoneId,
    storeId: data.storeId,
    type,
    postalCode: data.postalCode ?? null,
    rangeStart: data.rangeStart ?? null,
    rangeEnd: data.rangeEnd ?? null,
    costAmount: data.costAmount,
    currency: data.currency,
    createdAt: data.createdAt
  }
}

export function parseStoreShippingZones(data: unknown): StoreShippingZone[] {
  assertArray(data, 'Invalid store shipping zones payload')
  return data.map((item, index) => parseStoreShippingZoneWithIndex(item, index))
}

function parseStoreShippingZoneWithIndex(data: unknown, index: number): StoreShippingZone {
  try {
    return parseStoreShippingZone(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid store shipping zone'
    throw new Error(`Store shipping zone at ${index} is invalid: ${message}`)
  }
}

export const storeAdminAdapter = {
  async listZones(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/shipping/zones', {}, {}, auth)
    return parseStoreShippingZones(data)
  },
  async createZone(payload: StoreShippingZoneCreateReq, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/shipping/zones',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreShippingZone(data)
  },
  async deleteZone(zoneId: string, auth: AuthRequestContext) {
    await requestJsonWithAuth<unknown>(
      `/api/store/shipping/zones/${zoneId}`,
      { method: 'DELETE' },
      {},
      auth
    )
  }
}
