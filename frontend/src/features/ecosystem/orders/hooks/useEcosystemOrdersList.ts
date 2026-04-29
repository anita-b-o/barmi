import { useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { ecosystemAdapter } from '../api'
import type { EcosystemOrdersFilterStatus } from '../types'

type UseEcosystemOrdersListOptions = {
  retry?: boolean | number
  ecosystemId?: string
  createdFrom?: string
  createdTo?: string
  paidFrom?: string
  paidTo?: string
}

export function useEcosystemOrdersList(
  page: number,
  status: EcosystemOrdersFilterStatus,
  options: UseEcosystemOrdersListOptions = {}
) {
  const query = useQuery({
    queryKey: ['ecosystem-orders', page, status, options.ecosystemId, options.createdFrom, options.createdTo, options.paidFrom, options.paidTo],
    queryFn: () => ecosystemAdapter.listOrders(page, 20, status || undefined, {
      ecosystemId: options.ecosystemId,
      createdFrom: options.createdFrom,
      createdTo: options.createdTo,
      paidFrom: options.paidFrom,
      paidTo: options.paidTo
    }),
    retry: options.retry
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? extractBackendErrorMessage(query.error, 'Error cargando órdenes del ecosystem') : null,
    refetch: query.refetch
  }
}
