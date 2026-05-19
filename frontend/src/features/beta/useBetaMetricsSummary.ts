import { useQuery } from '@tanstack/react-query'
import { betaAdapter } from '@/api/adapters/betaAdapter'
import { useAuth } from '@/core/auth'

export function useBetaMetricsSummary() {
  const { authRequest, isAuthenticated } = useAuth()

  const query = useQuery({
    queryKey: ['beta-metrics-summary'],
    queryFn: () => betaAdapter.getMetricsSummary(authRequest),
    enabled: isAuthenticated
  })

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : query.error ? 'No se pudo cargar métricas beta.' : null,
    refetch: query.refetch
  }
}
