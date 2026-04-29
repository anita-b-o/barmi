import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { extractBackendErrorMessage } from '@/core/errors'
import { useAuth } from '@/core/auth'
import { ecosystemFulfillmentApi } from '../api'
import type { EcosystemFulfillmentStatus } from '../types'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'ecosystem_id_required') return 'Seleccioná un ecosystem para abrir el fulfillment.'
    if (code === 'forbidden') return 'No tenés permisos para operar este fulfillment.'
    if (code === 'fulfillment_not_found') return 'Fulfillment no encontrado para el ecosystem actual.'
    if (code === 'invalid_fulfillment_transition') return 'La transición de estado no es válida.'
  }

  return extractBackendErrorMessage(error, 'No se pudo cargar el fulfillment del ecosystem.')
}

export function useEcosystemFulfillmentDetail(fulfillmentId: string | undefined, ecosystemId: string) {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['ecosystem-fulfillment-detail', ecosystemId, fulfillmentId],
    enabled: Boolean(fulfillmentId && ecosystemId),
    queryFn: () => ecosystemFulfillmentApi.getById(fulfillmentId ?? '', ecosystemId, authRequest),
    retry: false
  })

  const updateMutation = useMutation({
    mutationFn: async (status: EcosystemFulfillmentStatus) => {
      if (!fulfillmentId) throw new Error('Fulfillment ID requerido')
      return ecosystemFulfillmentApi.updateStatus(fulfillmentId, status, authRequest)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ecosystem-fulfillment-detail', ecosystemId, fulfillmentId], data)
      void queryClient.invalidateQueries({ queryKey: ['ecosystem-fulfillments', ecosystemId] })
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
    updateStatus: (status: EcosystemFulfillmentStatus) => updateMutation.mutate(status),
    refetch: detailQuery.refetch
  }
}
