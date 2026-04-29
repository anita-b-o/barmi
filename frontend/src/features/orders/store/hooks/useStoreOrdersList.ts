import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { useAuth } from '@/core/auth'
import { getBrowserTenantContext } from '@/core/tenant'
import { storeAdapter } from '../api'
import type { StoreDerivedBooleanFilter, StoreOrderListItem, StoreOrderStatusFilter } from '../types'

const PAGE_SIZE = 10

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
  return extractBackendErrorMessage(error, 'Error cargando órdenes')
}

function toNullableBoolean(value: StoreDerivedBooleanFilter) {
  if (value === 'YES') return true
  if (value === 'NO') return false
  return undefined
}

type UseStoreOrdersListParams = {
  page: number
  status: StoreOrderStatusFilter
  query: string
  operationalConflict: StoreDerivedBooleanFilter
  fulfillment: StoreDerivedBooleanFilter
  createdFrom?: string
  createdTo?: string
  paidFrom?: string
  paidTo?: string
  manuallyCancelled?: boolean
  manualCancelledFrom?: string
  manualCancelledTo?: string
  hasConflictEvent?: boolean
  conflictFrom?: string
  conflictTo?: string
}

export function useStoreOrdersList({
  page,
  status,
  query,
  operationalConflict,
  fulfillment,
  createdFrom,
  createdTo,
  paidFrom,
  paidTo,
  manuallyCancelled,
  manualCancelledFrom,
  manualCancelledTo,
  hasConflictEvent,
  conflictFrom,
  conflictTo
}: UseStoreOrdersListParams) {
  const { authRequest } = useAuth()
  const ordersQuery = useQuery({
    queryKey: [
      'store-orders-list',
      page,
      status,
      operationalConflict,
      fulfillment,
      createdFrom,
      createdTo,
      paidFrom,
      paidTo,
      manuallyCancelled,
      manualCancelledFrom,
      manualCancelledTo,
      hasConflictEvent,
      conflictFrom,
      conflictTo
    ],
    queryFn: () =>
      storeAdapter.listAdminOrders(page, PAGE_SIZE, {
        status: status === 'ALL' ? undefined : status,
        createdFrom,
        createdTo,
        paidFrom,
        paidTo,
        hasOperationalConflict: toNullableBoolean(operationalConflict),
        manuallyCancelled,
        manualCancelledFrom,
        manualCancelledTo,
        hasConflictEvent,
        conflictFrom,
        conflictTo,
        hasFulfillment: toNullableBoolean(fulfillment),
        sort: 'createdAt,desc'
      }, authRequest)
  })

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return ordersQuery.data?.content ?? []
    return (ordersQuery.data?.content ?? []).filter((order: StoreOrderListItem) => order.orderId.toLowerCase().includes(normalized))
  }, [ordersQuery.data?.content, query])

  const hasActiveFilters = status !== 'ALL'
    || operationalConflict !== 'ALL'
    || fulfillment !== 'ALL'
    || Boolean(createdFrom)
    || Boolean(createdTo)
    || Boolean(paidFrom)
    || Boolean(paidTo)
    || typeof manuallyCancelled === 'boolean'
    || Boolean(manualCancelledFrom)
    || Boolean(manualCancelledTo)
    || typeof hasConflictEvent === 'boolean'
    || Boolean(conflictFrom)
    || Boolean(conflictTo)
    || query.trim().length > 0

  return {
    orders: filteredOrders,
    page,
    totalPages: ordersQuery.data?.totalPages ?? 0,
    totalElements: ordersQuery.data?.totalElements ?? 0,
    hasActiveFilters,
    isLoading: ordersQuery.isLoading,
    isFetching: ordersQuery.isFetching,
    error: ordersQuery.error ? toStoreErrorMessage(ordersQuery.error) : null,
    refetch: ordersQuery.refetch
  }
}
