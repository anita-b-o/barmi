import { requestJsonWithAuth } from '../../../../core/api'
import type { AuthRequestContext } from '../../../../core/api'
import { assertArray, assertRecord, assertString } from '../../../../api/adapters/validators'
import type { StoreFulfillmentRecord, StoreFulfillmentStatus } from '../types'

function parseStatus(value: unknown): StoreFulfillmentStatus {
  if (value === 'PENDING' || value === 'DISPATCHED' || value === 'DELIVERED' || value === 'CANCELLED') {
    return value
  }
  throw new Error('Invalid fulfillment status')
}

function parseStoreFulfillmentRecord(data: unknown): StoreFulfillmentRecord {
  assertRecord(data, 'Invalid fulfillment payload')
  assertString(data.fulfillmentId, 'fulfillmentId is required')
  assertString(data.storeOrderId, 'storeOrderId is required')
  assertString(data.storeId, 'storeId is required')
  assertString(data.method, 'method is required')
  assertString(data.createdAt, 'createdAt is required')

  return {
    fulfillmentId: data.fulfillmentId,
    storeOrderId: data.storeOrderId,
    storeId: data.storeId,
    method: data.method,
    status: parseStatus(data.status),
    createdAt: data.createdAt
  }
}

function parseStoreFulfillmentRecordWithIndex(data: unknown, index: number) {
  try {
    return parseStoreFulfillmentRecord(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid fulfillment'
    throw new Error(`Fulfillment at ${index} is invalid: ${message}`)
  }
}

function parseStoreFulfillmentList(data: unknown) {
  assertArray(data, 'Invalid fulfillment list payload')
  return data.map((item, index) => parseStoreFulfillmentRecordWithIndex(item, index))
}

export const storeFulfillmentApi = {
  async list(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/fulfillments', {}, {}, auth)
    return parseStoreFulfillmentList(data)
  },
  async create(orderId: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/orders/${orderId}/fulfillment`,
      {
        method: 'POST'
      },
      {},
      auth
    )
    return parseStoreFulfillmentRecord(data)
  },
  async getById(fulfillmentId: string, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/fulfillments/${fulfillmentId}`,
      {},
      {},
      auth
    )
    return parseStoreFulfillmentRecord(data)
  },
  async updateStatus(fulfillmentId: string, status: StoreFulfillmentStatus, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/fulfillments/${fulfillmentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      },
      {},
      auth
    )
    return parseStoreFulfillmentRecord(data)
  }
}
