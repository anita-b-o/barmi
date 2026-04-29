import { useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { useAuth } from '@/core/auth'
import { ecosystemFulfillmentApi } from '../api'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'ecosystem_id_required') return 'Seleccioná un ecosystem para ver fulfillments.'
    if (code === 'forbidden') return 'No tenés permisos para ver fulfillments de este ecosystem.'
    if (code === 'fulfillment_not_found') return 'Fulfillment no encontrado.'
  }

  return extractBackendErrorMessage(error, 'No se pudieron cargar los fulfillments del ecosystem.')
}

export function useEcosystemFulfillments(ecosystemId: string, options: { createdFrom?: string; createdTo?: string } = {}) {
  const { authRequest } = useAuth()
  const query = useQuery({
    queryKey: ['ecosystem-fulfillments', ecosystemId, options.createdFrom, options.createdTo],
    enabled: Boolean(ecosystemId),
    queryFn: () => ecosystemFulfillmentApi.list(ecosystemId, authRequest, options),
    retry: false
  })

  return {
    fulfillments: query.data ?? [],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error ? mapErrorMessage(query.error) : null,
    refetch: query.refetch
  }
}
