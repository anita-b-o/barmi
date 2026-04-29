import { useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { getBrowserTenantContext } from '@/core/tenant'
import { useAuth } from '@/core/auth'
import { storeFulfillmentApi } from '../api'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    const tenant = getBrowserTenantContext()

    if (code === 'store_context_required') {
      return tenant.slug
        ? `No se pudo resolver el contexto STORE para ${tenant.host}.`
        : 'Store context required. Abrí el frontend con un host de tienda.'
    }
    if (code === 'store_not_found') return 'La store actual no existe.'
    if (code === 'store_inactive') return 'La store actual está inactiva.'
    if (code === 'forbidden') return 'No tenés permisos para ver fulfillments de esta store.'
  }

  return extractBackendErrorMessage(error, 'No se pudieron cargar los fulfillments.')
}

export function useStoreFulfillments(options: { createdFrom?: string; createdTo?: string } = {}) {
  const { authRequest } = useAuth()
  const query = useQuery({
    queryKey: ['store-fulfillments', options.createdFrom, options.createdTo],
    queryFn: () => storeFulfillmentApi.list(authRequest, options)
  })

  return {
    fulfillments: query.data ?? [],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error ? mapErrorMessage(query.error) : null,
    refetch: query.refetch
  }
}
