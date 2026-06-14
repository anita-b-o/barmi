import { useQuery } from '@tanstack/react-query'
import { storeAdminAdapter } from '../../../api/adapters/storeAdminAdapter'
import { useAuth } from '@/core/auth'
import { extractBackendErrorMessage } from '@/core/errors'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'store_context_required') return 'No se pudo resolver la store actual para cargar commerce analytics.'
    if (code === 'store_not_found') return 'La store actual no existe.'
    if (code === 'forbidden') return 'No tenés permisos para ver commerce analytics de esta store.'
  }

  return extractBackendErrorMessage(error, 'No se pudo cargar commerce analytics de la store.')
}

export function useStoreCommerceAnalytics() {
  const { authRequest } = useAuth()
  const query = useQuery({
    queryKey: ['store-commerce-analytics', '7d'],
    queryFn: () => storeAdminAdapter.getCommerceAnalytics(authRequest),
    retry: false
  })

  return {
    analytics: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error ? mapErrorMessage(query.error) : null,
    refetch: query.refetch
  }
}
