import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { ecosystemAdapter } from '../api'

const POLLING_INTERVAL_MS = 5000
const MAX_POLLING_WINDOW_MS = 2 * 60 * 1000

export function useEcosystemOrderDetail(orderId: string | undefined) {
  const queryClient = useQueryClient()
  const [pollingStartedAt, setPollingStartedAt] = useState<number | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  useEffect(() => {
    setPollingStartedAt(orderId ? Date.now() : null)
    setRefreshError(null)
  }, [orderId])

  const query = useQuery({
    queryKey: ['ecosystem-order-detail', orderId],
    queryFn: () => ecosystemAdapter.getOrder(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: (currentQuery) => {
      if (!pollingStartedAt) return false

      const data = currentQuery.state.data
      const stillPending = data?.status === 'PENDING_PAYMENT'
      const withinWindow = Date.now() - pollingStartedAt < MAX_POLLING_WINDOW_MS

      if (!stillPending || !withinWindow) return false
      return POLLING_INTERVAL_MS
    }
  })

  const data = query.data ?? null
  const isPendingPayment = data?.status === 'PENDING_PAYMENT'
  const isPollingWindowOpen = pollingStartedAt !== null && Date.now() - pollingStartedAt < MAX_POLLING_WINDOW_MS

  const refetch = async () => {
    if (!orderId) {
      return query.refetch()
    }

    try {
      const data = await ecosystemAdapter.getOrder(orderId)
      queryClient.setQueryData(['ecosystem-order-detail', orderId], data)
      setRefreshError(null)
      return { data, error: null }
    } catch (err) {
      setRefreshError(extractBackendErrorMessage(err, 'Error cargando detalle de orden ecosystem'))
      throw err
    }
  }

  return {
    data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error
      ? extractBackendErrorMessage(query.error, 'Error cargando detalle de orden ecosystem')
      : refreshError,
    refetch,
    isAutoRefreshing: Boolean(isPendingPayment && isPollingWindowOpen),
    pollingExpired: Boolean(isPendingPayment && !isPollingWindowOpen)
  }
}
