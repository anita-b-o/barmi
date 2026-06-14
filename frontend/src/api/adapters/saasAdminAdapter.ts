import { requestJsonWithAuth, type AuthRequestContext } from '../client/http'
import type {
  SaasChangeStorePlanReq,
  SaasPlan,
  SaasPlanCreateReq,
  SaasPlanUpdateReq,
  SaasSubscription,
  SaasSubscriptionStatus
} from '../contracts/v1/saasAdmin'
import { assertArray, assertNumber, assertRecord, assertString } from './validators'

function assertBoolean(value: unknown, message: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(message)
}

function assertNullableString(value: unknown, message: string): asserts value is string | null {
  if (value === null) return
  if (typeof value !== 'string') throw new Error(message)
}

function parseStatus(value: unknown, message: string): SaasSubscriptionStatus {
  if (
    value === 'TRIAL' ||
    value === 'ACTIVE' ||
    value === 'PAST_DUE' ||
    value === 'SUSPENDED' ||
    value === 'CANCELLED'
  ) {
    return value
  }
  throw new Error(message)
}

export function parseSaasPlan(data: unknown): SaasPlan {
  assertRecord(data, 'Invalid SaaS plan payload')
  assertString(data.id, 'SaaS plan id is required')
  assertString(data.code, 'SaaS plan code is required')
  assertString(data.name, 'SaaS plan name is required')
  assertBoolean(data.active, 'SaaS plan active is required')
  assertNullableString(data.description, 'SaaS plan description is invalid')
  assertNumber(data.maxProducts, 'SaaS plan maxProducts is required')
  assertBoolean(data.analyticsEnabled, 'SaaS plan analyticsEnabled is required')
  assertBoolean(data.seoEnabled, 'SaaS plan seoEnabled is required')
  assertString(data.createdAt, 'SaaS plan createdAt is required')
  assertString(data.updatedAt, 'SaaS plan updatedAt is required')

  return {
    id: data.id,
    code: data.code,
    name: data.name,
    active: data.active,
    description: data.description ?? null,
    maxProducts: data.maxProducts,
    analyticsEnabled: data.analyticsEnabled,
    seoEnabled: data.seoEnabled,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
}

export function parseSaasPlans(data: unknown): SaasPlan[] {
  assertArray(data, 'Invalid SaaS plans payload')
  return data.map((item, index) => {
    try {
      return parseSaasPlan(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid SaaS plan'
      throw new Error(`SaaS plan at ${index} is invalid: ${message}`)
    }
  })
}

export function parseSaasSubscription(data: unknown): SaasSubscription {
  assertRecord(data, 'Invalid SaaS subscription payload')
  assertString(data.subscriptionId, 'SaaS subscription id is required')
  assertString(data.storeId, 'SaaS subscription storeId is required')
  assertNullableString(data.storeSlug, 'SaaS subscription storeSlug is invalid')
  assertNullableString(data.storeName, 'SaaS subscription storeName is invalid')
  assertString(data.planId, 'SaaS subscription planId is required')
  assertString(data.planCode, 'SaaS subscription planCode is required')
  assertString(data.planName, 'SaaS subscription planName is required')
  assertNumber(data.maxProducts, 'SaaS subscription maxProducts is required')
  assertBoolean(data.analyticsEnabled, 'SaaS subscription analyticsEnabled is required')
  assertBoolean(data.seoEnabled, 'SaaS subscription seoEnabled is required')
  assertString(data.startedAt, 'SaaS subscription startedAt is required')
  assertNullableString(data.expiresAt, 'SaaS subscription expiresAt is invalid')
  assertString(data.createdAt, 'SaaS subscription createdAt is required')
  assertString(data.updatedAt, 'SaaS subscription updatedAt is required')

  return {
    subscriptionId: data.subscriptionId,
    storeId: data.storeId,
    storeSlug: data.storeSlug ?? null,
    storeName: data.storeName ?? null,
    planId: data.planId,
    planCode: data.planCode,
    planName: data.planName,
    maxProducts: data.maxProducts,
    analyticsEnabled: data.analyticsEnabled,
    seoEnabled: data.seoEnabled,
    status: parseStatus(data.status, 'SaaS subscription status is invalid'),
    startedAt: data.startedAt,
    expiresAt: data.expiresAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
}

export function parseSaasSubscriptions(data: unknown): SaasSubscription[] {
  assertArray(data, 'Invalid SaaS subscriptions payload')
  return data.map((item, index) => {
    try {
      return parseSaasSubscription(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid SaaS subscription'
      throw new Error(`SaaS subscription at ${index} is invalid: ${message}`)
    }
  })
}

export const saasAdminAdapter = {
  async listPlans(auth: AuthRequestContext): Promise<SaasPlan[]> {
    const data = await requestJsonWithAuth<unknown>('/api/admin/saas/plans', {}, {}, auth)
    return parseSaasPlans(data)
  },

  async createPlan(payload: SaasPlanCreateReq, auth: AuthRequestContext): Promise<SaasPlan> {
    const data = await requestJsonWithAuth<unknown>(
      '/api/admin/saas/plans',
      { method: 'POST', body: JSON.stringify(payload) },
      {},
      auth
    )
    return parseSaasPlan(data)
  },

  async updatePlan(planId: string, payload: SaasPlanUpdateReq, auth: AuthRequestContext): Promise<SaasPlan> {
    const data = await requestJsonWithAuth<unknown>(
      `/api/admin/saas/plans/${encodeURIComponent(planId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      {},
      auth
    )
    return parseSaasPlan(data)
  },

  async listSubscriptions(auth: AuthRequestContext): Promise<SaasSubscription[]> {
    const data = await requestJsonWithAuth<unknown>('/api/admin/saas/subscriptions', {}, {}, auth)
    return parseSaasSubscriptions(data)
  },

  async changeStorePlan(storeId: string, payload: SaasChangeStorePlanReq, auth: AuthRequestContext): Promise<SaasSubscription> {
    const data = await requestJsonWithAuth<unknown>(
      `/api/admin/saas/subscriptions/stores/${encodeURIComponent(storeId)}/plan`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      {},
      auth
    )
    return parseSaasSubscription(data)
  }
}
