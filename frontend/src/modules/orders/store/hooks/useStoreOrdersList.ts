import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { getBrowserTenantContext } from '../../../../core/tenant'
import { storeAdapter } from '../api'
import type { StoreOrderListItem, StoreOrderStatusFilter } from '../types'

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

export function useStoreOrdersList() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<StoreOrderStatusFilter>('ALL')
  const [query, setQuery] = useState('')

  const ordersQuery = useQuery({
    queryKey: ['store-orders-list', page, status],
    queryFn: () =>
      storeAdapter.listOrders(page, PAGE_SIZE, {
        status: status === 'ALL' ? undefined : status,
        sort: 'createdAt,desc'
      })
  })

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return ordersQuery.data?.content ?? []
    return (ordersQuery.data?.content ?? []).filter((order: StoreOrderListItem) => order.orderId.toLowerCase().includes(normalized))
  }, [ordersQuery.data?.content, query])

  const hasActiveFilters = status !== 'ALL' || query.trim().length > 0

  return {
    orders: filteredOrders,
    page,
    totalPages: ordersQuery.data?.totalPages ?? 0,
    totalElements: ordersQuery.data?.totalElements ?? 0,
    query,
    status,
    hasActiveFilters,
    isLoading: ordersQuery.isLoading,
    isFetching: ordersQuery.isFetching,
    error: ordersQuery.error ? toStoreErrorMessage(ordersQuery.error) : null,
    setPage,
    setQuery: (value: string) => {
      setQuery(value)
      setPage(0)
    },
    setStatus: (value: StoreOrderStatusFilter) => {
      setStatus(value)
      setPage(0)
    },
    resetFilters: () => {
      setQuery('')
      setStatus('ALL')
      setPage(0)
    },
    refetch: ordersQuery.refetch
  }
}
