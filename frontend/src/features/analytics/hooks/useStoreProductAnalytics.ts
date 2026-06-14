import { useQuery } from '@tanstack/react-query'
import { storeAdminAdapter } from '../../../api/adapters/storeAdminAdapter'
import type { StoreProductAnalyticsRange } from '../../../api/contracts/v1/storeAdmin'
import { useAuth } from '@/core/auth'
import { extractBackendErrorMessage } from '@/core/errors'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'store_context_required') return 'No se pudo resolver la store actual para cargar analytics de productos.'
    if (code === 'store_not_found') return 'La store actual no existe.'
    if (code === 'forbidden') return 'No tenés permisos para ver analytics de productos de esta store.'
  }

  return extractBackendErrorMessage(error, 'No se pudo cargar analytics de productos de la store.')
}

export function useStoreProductAnalytics(range: StoreProductAnalyticsRange = '7d') {
  const { authRequest } = useAuth()
  const query = useQuery({
    queryKey: ['store-product-analytics', range],
    queryFn: () => storeAdminAdapter.getProductAnalytics(range, authRequest),
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
