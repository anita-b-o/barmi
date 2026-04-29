import { useMutation, useQueryClient } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { useAuth } from '@/core/auth'
import { ecosystemFulfillmentApi } from '../api'

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'order_not_found') return 'La orden ecosystem no existe.'
    if (code === 'order_not_paid') return 'Sólo se puede crear fulfillment para órdenes pagadas.'
    if (code === 'fulfillment_exists') return 'La orden ya tiene un fulfillment asociado.'
    if (code === 'forbidden') return 'No tenés permisos para crear fulfillments en este ecosystem.'
  }

  return extractBackendErrorMessage(error, 'No se pudo crear el fulfillment del ecosystem.')
}

export function useEcosystemCreateFulfillment(ecosystemId: string) {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (orderId: string) => ecosystemFulfillmentApi.create(orderId, authRequest),
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: ['ecosystem-fulfillments', ecosystemId] })
      queryClient.setQueryData(['ecosystem-fulfillment-detail', ecosystemId, record.fulfillmentId], record)
    }
  })

  return {
    createFulfillment: (orderId: string) => mutation.mutateAsync(orderId),
    createdFulfillment: mutation.data ?? null,
    loading: mutation.isPending,
    error: mutation.error ? mapErrorMessage(mutation.error) : null
  }
}
