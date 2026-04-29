import { requestJsonWithAuth, type AuthRequestContext } from '@/core/api'
import { assertArray, assertRecord, assertString } from '../../../../api/adapters/validators'
import type {
  CreateStoreMemberPayload,
  StoreMemberRole,
  StoreMemberRow,
  StoreMemberStatus,
  UpdateStoreMemberRolePayload,
  UpdateStoreMemberStatusPayload
} from '../types'

function parseRole(value: unknown): StoreMemberRole {
  if (value === 'OWNER' || value === 'ADMIN' || value === 'STAFF') return value
  throw new Error('Store member role is invalid')
}

function parseStatus(value: unknown): StoreMemberStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE') return value
  throw new Error('Store member status is invalid')
}

export function parseStoreMember(data: unknown): StoreMemberRow {
  assertRecord(data, 'Invalid store member payload')
  assertString(data.memberId, 'Store member memberId is required')
  assertString(data.storeId, 'Store member storeId is required')
  assertString(data.storeSlug, 'Store member storeSlug is required')
  assertString(data.memberEmail, 'Store member memberEmail is required')
  assertString(data.createdAt, 'Store member createdAt is required')

  return {
    memberId: data.memberId,
    storeId: data.storeId,
    storeSlug: data.storeSlug,
    memberEmail: data.memberEmail,
    role: parseRole(data.role),
    status: parseStatus(data.status),
    createdAt: data.createdAt
  }
}

function parseStoreMemberWithIndex(data: unknown, index: number) {
  try {
    return parseStoreMember(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid store member'
    throw new Error(`Store member at ${index} is invalid: ${message}`)
  }
}

function parseStoreMembers(data: unknown) {
  assertArray(data, 'Invalid store members payload')
  return data.map((item, index) => parseStoreMemberWithIndex(item, index))
}

export const storeMembersApi = {
  async list(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/store/members', {}, {}, auth)
    return parseStoreMembers(data)
  },
  async create(payload: CreateStoreMemberPayload, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      '/api/store/members',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      {},
      auth
    )
    return parseStoreMember(data)
  },
  async updateRole(payload: UpdateStoreMemberRolePayload, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/members/${payload.memberId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: payload.role })
      },
      {},
      auth
    )
    return parseStoreMember(data)
  },
  async updateStatus(payload: UpdateStoreMemberStatusPayload, auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>(
      `/api/store/members/${payload.memberId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: payload.status })
      },
      {},
      auth
    )
    return parseStoreMember(data)
  }
}
