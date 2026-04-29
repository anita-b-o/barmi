import { useMutation, useQueryClient } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { useAuth } from '@/core/auth'
import { getBrowserTenantContext } from '@/core/tenant'
import { storeAdapter } from '../api'

function mapErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    const tenant = getBrowserTenantContext()

    if (code === 'store_context_required') {
      return tenant.slug
        ? `No se pudo resolver el contexto STORE para ${tenant.host}.`
        : 'Store context required. Abrí el frontend con un host de tienda.'
    }
    if (code === 'store_order_not_found') return 'La orden no existe en la store actual.'
    if (code === 'order_has_fulfillment') return 'La orden ya tiene fulfillment y no admite cancelación manual.'
    if (code === 'order_cancelled') return 'La orden ya fue cancelada.'
    if (code === 'order_payment_not_confirmed') return 'La orden todavía no tiene un pago confirmado para reprocesar.'
    if (code === 'order_retry_not_available') return 'La orden no tiene un conflicto operativo reintentable.'
    if (code === 'forbidden') return 'No tenés permisos para operar esta orden.'
  }

  return extractBackendErrorMessage(error, fallback)
}

export function useStoreOrderAdminActions(orderId: string | undefined) {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('Order ID requerido')
      return storeAdapter.cancelOrder(orderId, authRequest)
    },
    onSuccess: async () => {
      if (!orderId) return
      await queryClient.invalidateQueries({ queryKey: ['store-admin-order-detail', orderId] })
      await queryClient.invalidateQueries({ queryKey: ['store-orders-list'] })
    }
  })

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('Order ID requerido')
      return storeAdapter.retryProcessing(orderId, authRequest)
    },
    onSuccess: async () => {
      if (!orderId) return
      await queryClient.invalidateQueries({ queryKey: ['store-admin-order-detail', orderId] })
      await queryClient.invalidateQueries({ queryKey: ['store-orders-list'] })
      await queryClient.invalidateQueries({ queryKey: ['store-fulfillments'] })
    }
  })

  return {
    cancelOrder: async () => cancelMutation.mutateAsync(),
    retryProcessing: async () => retryMutation.mutateAsync(),
    cancelling: cancelMutation.isPending,
    retrying: retryMutation.isPending,
    cancelError: cancelMutation.error ? mapErrorMessage(cancelMutation.error, 'No se pudo cancelar la orden.') : null,
    retryError: retryMutation.error ? mapErrorMessage(retryMutation.error, 'No se pudo reprocesar la orden.') : null
  }
}
