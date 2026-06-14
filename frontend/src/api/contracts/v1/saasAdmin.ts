export type SaasSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED'

export type SaasPlan = {
  id: string
  code: string
  name: string
  active: boolean
  description: string | null
  maxProducts: number
  analyticsEnabled: boolean
  seoEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type SaasPlanCreateReq = {
  code: string
  name: string
  active?: boolean
  description?: string | null
  maxProducts: number
  analyticsEnabled: boolean
  seoEnabled: boolean
}

export type SaasPlanUpdateReq = {
  name: string
  active: boolean
  description?: string | null
  maxProducts: number
  analyticsEnabled: boolean
  seoEnabled: boolean
}

export type SaasSubscription = {
  subscriptionId: string
  storeId: string
  storeSlug: string | null
  storeName: string | null
  planId: string
  planCode: string
  planName: string
  maxProducts: number
  analyticsEnabled: boolean
  seoEnabled: boolean
  status: SaasSubscriptionStatus
  startedAt: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type SaasChangeStorePlanReq = {
  planId?: string | null
  planCode?: string | null
  status?: SaasSubscriptionStatus | null
  expiresAt?: string | null
}
