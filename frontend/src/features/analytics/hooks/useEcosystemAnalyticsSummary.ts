import { useQuery } from '@tanstack/react-query'
import { ecosystemAdminAdapter } from '../../../api/adapters/ecosystemAdminAdapter'
import { useAuth } from '@/core/auth'
import { extractBackendErrorMessage } from '@/core/errors'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'ecosystem_id_required') return 'Seleccioná un ecosystem para ver analytics.'
    if (code === 'ecosystem_not_found') return 'El ecosystem seleccionado no existe.'
    if (code === 'forbidden') return 'No tenés permisos para ver analytics de este ecosystem.'
  }

  return extractBackendErrorMessage(error, 'No se pudo cargar el resumen analytics del ecosystem.')
}

export function useEcosystemAnalyticsSummary(ecosystemId: string) {
  const { authRequest } = useAuth()
  const query = useQuery({
    queryKey: ['ecosystem-analytics-summary', ecosystemId],
    enabled: Boolean(ecosystemId),
    queryFn: () => ecosystemAdminAdapter.getAnalyticsSummary(ecosystemId, authRequest),
    retry: false
  })

  return {
    summary: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error ? mapErrorMessage(query.error) : null,
    refetch: query.refetch
  }
}
