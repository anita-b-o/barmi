import { requestJson, requestJsonWithAuth, type AuthRequestContext } from '../client/http'

export type BetaTelemetryRequest = {
  eventName: string
  storeId?: string
  storeSlug?: string
  storeName?: string
  ecosystemSlug?: string
  productId?: string
  searchTerm?: string
  requestId?: string
  sessionId: string
  route: string
  releaseId: string
  environment: string
  occurredAt: string
  metadata?: Record<string, string>
}

export type BetaFeedbackRequest = {
  category: 'bug' | 'confusing' | 'missing' | 'love_it'
  score?: number
  message: string
  route: string
  storeId?: string
  storeSlug?: string
  ecosystemSlug?: string
  requestId?: string
  sessionId: string
  releaseId: string
  environment: string
}

export type BetaMetricsSummary = {
  homeViews: number
  catalogViews: number
  mapViews: number
  storeViews: number
  searchUses: number
  searchNoResults?: number
  productClicks: number
  storeClicks: number
  mapPinClicks: number
  checkoutStarted: number
  paymentInitiated: number
  checkoutSuccess: number
  checkoutFailure: number
  checkoutAbandoned?: number
  checkoutSuccessRate: number
  loginSuccess: number
  loginFailure: number
  loginFailureRate: number
  feedbackSubmitted: number
  feedbackBug: number
  feedbackConfusing: number
  feedbackMissing: number
  feedbackLoveIt: number
  topStores: Array<{ storeSlug: string; storeName: string; views: number }>
  topSearches: Array<{ query: string; uses: number }>
  feedbackRoutes?: Array<{ route: string; total: number }>
  recentFeedback?: Array<{
    category: string
    score?: number | null
    message: string
    route: string
    requestId?: string | null
    releaseId: string
    createdAt: string
  }>
  recentFailures?: Array<{
    eventName: string
    route: string
    requestId?: string | null
    releaseId: string
    occurredAt: string
    reason?: string | null
  }>
}

export type BetaStoreStatus = 'READY' | 'IN_PROGRESS' | 'NOT_STARTED'

export type BetaStore = {
  storeId: string
  storeSlug: string
  storeName: string
  readinessScore: number
  publishReady: boolean
  betaStatus: BetaStoreStatus
  appearancePreset: string
  capabilitiesEnabled: string[]
  createdAt: string
}

export const betaAdapter = {
  submitTelemetry: async (payload: BetaTelemetryRequest) => {
    return requestJson('/api/public/beta/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  submitFeedback: async (payload: BetaFeedbackRequest) => {
    return requestJson('/api/public/beta/feedback', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  getMetricsSummary: async (auth: AuthRequestContext) => {
    return requestJsonWithAuth<BetaMetricsSummary>('/api/admin/beta/summary', {}, {}, auth)
  },
  getStores: async (auth: AuthRequestContext) => {
    return requestJsonWithAuth<BetaStore[]>('/api/admin/beta/stores', {}, {}, auth)
  }
}
