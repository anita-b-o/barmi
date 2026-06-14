import { describe, expect, it } from 'vitest'
import { parseSaasPlan, parseSaasPlans, parseSaasSubscription, parseSaasSubscriptions } from '@/api/adapters/saasAdminAdapter'

const plan = {
  id: 'plan-free',
  code: 'FREE',
  name: 'Free',
  active: true,
  description: null,
  maxProducts: 50,
  analyticsEnabled: false,
  seoEnabled: false,
  createdAt: '2026-06-14T12:00:00Z',
  updatedAt: '2026-06-14T12:00:00Z'
}

const subscription = {
  subscriptionId: 'sub-1',
  storeId: 'store-1',
  storeSlug: 'demo-store',
  storeName: 'Demo Store',
  planId: 'plan-free',
  planCode: 'FREE',
  planName: 'Free',
  maxProducts: 50,
  analyticsEnabled: false,
  seoEnabled: false,
  status: 'ACTIVE',
  startedAt: '2026-06-14T12:00:00Z',
  expiresAt: null,
  createdAt: '2026-06-14T12:00:00Z',
  updatedAt: '2026-06-14T12:00:00Z'
}

describe('SaaS admin contract parsing', () => {
  it('parses plans and subscriptions', () => {
    expect(parseSaasPlan(plan).code).toBe('FREE')
    expect(parseSaasPlans([plan])).toHaveLength(1)
    expect(parseSaasSubscription(subscription).status).toBe('ACTIVE')
    expect(parseSaasSubscriptions([subscription])).toHaveLength(1)
  })

  it('rejects invalid subscription status', () => {
    expect(() => parseSaasSubscription({ ...subscription, status: 'PAID' })).toThrow('status is invalid')
  })
})
