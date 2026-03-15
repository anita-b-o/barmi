import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { getBrowserTenantContext } from '../../../../core/tenant'
import { useAuth } from '../../../../core/auth'
import { storeFulfillmentApi } from '../api'
import type { StoreFulfillmentStatus } from '../types'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    const tenant = getBrowserTenantContext()

    if (code === 'store_context_required') {
      return tenant.slug
        ? `No se pudo resolver el contexto STORE para ${tenant.host}.`
        : 'Store context required. Abrí el frontend con un host de tienda.'
    }
    if (code === 'store_not_found') return 'La store actual no existe.'
    if (code === 'store_inactive') return 'La store actual está inactiva.'
    if (code === 'fulfillment_not_found') return 'Fulfillment no encontrado para la tienda actual.'
    if (code === 'forbidden') return 'No tenés permisos para operar este fulfillment.'
    if (code === 'invalid_fulfillment_transition') return 'La transición de estado no es válida.'
  }

  return extractBackendErrorMessage(error, 'No se pudo cargar el fulfillment.')
}

export function useStoreFulfillmentDetail(fulfillmentId: string | undefined) {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['store-fulfillment-detail', fulfillmentId],
    enabled: !!fulfillmentId,
    queryFn: () => storeFulfillmentApi.getById(fulfillmentId ?? '', authRequest)
  })

  const updateMutation = useMutation({
    mutationFn: async (status: StoreFulfillmentStatus) => {
      if (!fulfillmentId) throw new Error('Fulfillment ID requerido')
      return storeFulfillmentApi.updateStatus(fulfillmentId, status, authRequest)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['store-fulfillment-detail', fulfillmentId], data)
      void queryClient.invalidateQueries({ queryKey: ['store-fulfillments'] })
      setUpdateMessage(`Estado actualizado a ${data.status}.`)
    },
    onError: () => {
      setUpdateMessage(null)
    }
  })

  return {
    fulfillment: detailQuery.data ?? null,
    currentStatus: detailQuery.data?.status ?? null,
    error: detailQuery.error ? mapErrorMessage(detailQuery.error) : (updateMutation.error ? mapErrorMessage(updateMutation.error) : null),
    successMessage: updateMessage,
    isLoading: detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    isUpdating: updateMutation.isPending,
    updateStatus: (status: StoreFulfillmentStatus) => updateMutation.mutate(status),
    refetch: detailQuery.refetch
  }
}
