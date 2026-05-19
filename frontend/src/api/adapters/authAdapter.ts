import { requestJson, requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type { AuthLoginReq, AuthMe, AuthTokenResponse } from '../contracts/v1/auth'
import { assertArray, assertRecord, assertString } from './validators'

export function parseAuthTokenResponse(data: unknown): AuthTokenResponse {
  assertRecord(data, 'Invalid auth token response payload')
  assertString(data.accessToken, 'Auth accessToken is required')
  assertString(data.tokenType, 'Auth tokenType is required')
  assertString(data.expiresAt, 'Auth expiresAt is required')
  return {
    accessToken: data.accessToken,
    tokenType: data.tokenType,
    expiresAt: data.expiresAt
  }
}

function parseStoreMemberships(data: unknown) {
  assertArray(data, 'Auth store memberships must be an array')
  return data.map((item, index) => {
    assertRecord(item, `Auth store membership at ${index} is invalid`)
    assertString(item.storeId, `Auth store membership storeId at ${index} is required`)
    assertString(item.storeSlug, `Auth store membership storeSlug at ${index} is required`)
    assertString(item.role, `Auth store membership role at ${index} is required`)
    assertString(item.status, `Auth store membership status at ${index} is required`)
    return {
      storeId: item.storeId,
      storeSlug: item.storeSlug,
      role: item.role,
      status: item.status
    }
  })
}

function parseEcosystemMemberships(data: unknown) {
  assertArray(data, 'Auth ecosystem memberships must be an array')
  return data.map((item, index) => {
    assertRecord(item, `Auth ecosystem membership at ${index} is invalid`)
    assertString(item.ecosystemId, `Auth ecosystem membership ecosystemId at ${index} is required`)
    assertString(item.ecosystemSlug, `Auth ecosystem membership ecosystemSlug at ${index} is required`)
    assertString(item.role, `Auth ecosystem membership role at ${index} is required`)
    assertString(item.status, `Auth ecosystem membership status at ${index} is required`)
    return {
      ecosystemId: item.ecosystemId,
      ecosystemSlug: item.ecosystemSlug,
      role: item.role,
      status: item.status
    }
  })
}

export function parseAuthMe(data: unknown): AuthMe {
  assertRecord(data, 'Invalid auth me payload')
  assertString(data.userId, 'Auth me userId is required')
  assertString(data.email, 'Auth me email is required')
  assertRecord(data.memberships, 'Auth me memberships is required')
  const stores = parseStoreMemberships(data.memberships.stores)
  const ecosystems = parseEcosystemMemberships(data.memberships.ecosystems)
  return {
    userId: data.userId,
    email: data.email,
    memberships: {
      stores,
      ecosystems
    }
  }
}

export const authAdapter = {
  async login(payload: AuthLoginReq) {
    const data = await requestJson<unknown>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      credentials: 'include'
    })
    return parseAuthTokenResponse(data)
  },
  async refresh() {
    const data = await requestJson<unknown>('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    }, { transientRetry: 'always' })
    return parseAuthTokenResponse(data)
  },
  async logout() {
    await requestJson<unknown>('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
  },
  async me(auth: AuthRequestContext) {
    const data = await requestJsonWithAuth<unknown>('/api/auth/me', {}, {}, auth)
    return parseAuthMe(data)
  }
}
