import { useQuery } from '@tanstack/react-query'
import { ecosystemAdminAdapter } from '../../../api/adapters/ecosystemAdminAdapter'
import type { EcosystemOperationalReportRange } from '../../../api/contracts/v1/ecosystemAdmin'
import { useAuth } from '@/core/auth'
import { extractBackendErrorMessage } from '@/core/errors'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'ecosystem_id_required') return 'Seleccioná un ecosystem para ver reporting operativo.'
    if (code === 'ecosystem_not_found') return 'El ecosystem seleccionado no existe.'
    if (code === 'forbidden') return 'No tenés permisos para ver reporting operativo de este ecosystem.'
  }

  return extractBackendErrorMessage(error, 'No se pudo cargar el reporte operativo del ecosystem.')
}

export function useEcosystemOperationalReport(ecosystemId: string, range: EcosystemOperationalReportRange) {
  const { authRequest } = useAuth()
  const query = useQuery({
    queryKey: ['ecosystem-operational-report', ecosystemId, range],
    enabled: Boolean(ecosystemId),
    queryFn: () => ecosystemAdminAdapter.getOperationalReport(ecosystemId, range, authRequest),
    retry: false
  })

  return {
    report: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error ? mapErrorMessage(query.error) : null,
    refetch: query.refetch
  }
}
