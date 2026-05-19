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
  productClicks: number
  storeClicks: number
  mapPinClicks: number
  checkoutStarted: number
  paymentInitiated: number
  checkoutSuccess: number
  checkoutFailure: number
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
  }
}
