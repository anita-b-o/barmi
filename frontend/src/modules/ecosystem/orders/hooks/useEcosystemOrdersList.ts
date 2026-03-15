import { useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { ecosystemAdapter } from '../api'
import type { EcosystemOrdersFilterStatus } from '../types'

export function useEcosystemOrdersList(page: number, status: EcosystemOrdersFilterStatus) {
  const query = useQuery({
    queryKey: ['ecosystem-orders', page, status],
    queryFn: () => ecosystemAdapter.listOrders(page, 20, status || undefined)
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? extractBackendErrorMessage(query.error, 'Error cargando órdenes del ecosystem') : null
  }
}
