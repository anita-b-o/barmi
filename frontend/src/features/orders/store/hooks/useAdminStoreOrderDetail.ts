import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { extractBackendErrorMessage } from '@/core/errors'
import { useAuth } from '@/core/auth'
import { getBrowserTenantContext } from '@/core/tenant'
import { storeAdapter } from '../api'
import type { StoreAdminOrderDetailViewModel } from '../types'

const POLLING_INTERVAL_MS = 5000
const MAX_POLLING_WINDOW_MS = 2 * 60 * 1000

function toStoreErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'store_context_required') {
      const tenant = getBrowserTenantContext()
      return tenant.slug
        ? `No se pudo resolver el contexto STORE para ${tenant.host}.`
        : 'Store context required. Abrí el frontend con un host de tienda.'
    }
  }
  return extractBackendErrorMessage(error, 'Error cargando orden admin')
}

function toViewModel(order: Awaited<ReturnType<typeof storeAdapter.getAdminOrder>>): StoreAdminOrderDetailViewModel {
  return {
    orderId: order.orderId,
    status: order.status,
    currency: order.currency,
    createdAt: order.createdAt,
    subtotalAmount: order.subtotalAmount,
    shippingCostAmount: order.shippingCostAmount,
    totalAmount: order.totalAmount,
    shippingZoneId: order.shipping?.zoneId ?? null,
    shippingPostalCode: order.shipping?.postalCode ?? null,
    items: order.items,
    payment: order.payment,
    operationalIssue: order.operationalIssue,
    operationalSummary: order.operationalSummary,
    timeline: order.timeline
  }
}

export function useAdminStoreOrderDetail(orderId: string | undefined) {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()
  const [pollingStartedAt, setPollingStartedAt] = useState<number | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  useEffect(() => {
    setPollingStartedAt(orderId ? Date.now() : null)
    setRefreshError(null)
  }, [orderId])

  const query = useQuery({
    queryKey: ['store-admin-order-detail', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID requerido')
      const response = await storeAdapter.getAdminOrder(orderId, authRequest)
      return toViewModel(response)
    },
    enabled: Boolean(orderId),
    refetchInterval: (currentQuery) => {
      if (!pollingStartedAt) return false

      const data = currentQuery.state.data
      const stillPending = data?.status === 'PENDING_PAYMENT'
      const hasOperationalConflict = Boolean(data?.operationalIssue)
      const withinWindow = Date.now() - pollingStartedAt < MAX_POLLING_WINDOW_MS

      if (!stillPending || hasOperationalConflict || !withinWindow) return false
      return POLLING_INTERVAL_MS
    }
  })

  const order = query.data ?? null
  const isPendingPayment = order?.status === 'PENDING_PAYMENT'
  const hasOperationalConflict = Boolean(order?.operationalIssue)
  const isPollingWindowOpen = pollingStartedAt !== null && Date.now() - pollingStartedAt < MAX_POLLING_WINDOW_MS

  const refetch = async () => {
    if (!orderId) {
      return query.refetch()
    }

    try {
      const response = await storeAdapter.getAdminOrder(orderId, authRequest)
      const data = toViewModel(response)
      queryClient.setQueryData(['store-admin-order-detail', orderId], data)
      setRefreshError(null)
      return { data, error: null }
    } catch (error) {
      setRefreshError(toStoreErrorMessage(error))
      throw error
    }
  }

  return {
    order,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? toStoreErrorMessage(query.error) : refreshError,
    refetch,
    isAutoRefreshing: Boolean(isPendingPayment && !hasOperationalConflict && isPollingWindowOpen),
    pollingExpired: Boolean(isPendingPayment && !hasOperationalConflict && !isPollingWindowOpen)
  }
}
