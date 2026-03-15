import { useMutation, useQueryClient } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { getBrowserTenantContext } from '../../../../core/tenant'
import { useAuth } from '../../../../core/auth'
import { storeFulfillmentApi } from '../api'

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
    if (code === 'forbidden') return 'No tenés permisos para crear fulfillments en esta store.'
  }

  return extractBackendErrorMessage(error, 'No se pudo crear el fulfillment.')
}

export function useStoreCreateFulfillment() {
  const { authRequest } = useAuth()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (orderId: string) => storeFulfillmentApi.create(orderId, authRequest),
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: ['store-fulfillments'] })
      queryClient.setQueryData(['store-fulfillment-detail', record.fulfillmentId], record)
    }
  })

  return {
    createFulfillment: (orderId: string) => mutation.mutateAsync(orderId),
    createdFulfillment: mutation.data ?? null,
    loading: mutation.isPending,
    error: mutation.error ? mapErrorMessage(mutation.error) : null
  }
}
