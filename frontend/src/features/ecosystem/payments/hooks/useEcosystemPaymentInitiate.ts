import { useMutation, useQuery } from '@tanstack/react-query'
import { appConfig } from '@/app/config/env'
import { useAuth } from '@/core/auth'
import { extractBackendErrorMessage } from '@/core/errors'
import { routes } from '@/core/constants/routes'
import { paymentAdapter, publicEcosystemAdapter } from '../api'
import type { EcosystemPaymentInitiateInput } from '../types'

const PAYMENT_PROVIDER = 'MERCADOPAGO'

function mapPaymentError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'order_not_payable') return 'La orden ya no está disponible para pago.'
    if (code === 'ecosystem_order_not_found') return 'La orden ecosystem no existe.'
    if (code === 'ecosystem_id_required') return 'No se pudo resolver el ecosystem para iniciar el pago.'
    if (code === 'payment_provider_unavailable') return 'El proveedor de pago no está disponible en este momento.'
  }
  return extractBackendErrorMessage(error, 'No se pudo iniciar el pago.')
}

function buildReturnUrl(orderId: string, returnPath?: string) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${returnPath ?? routes.ecosystemOrderDetailPath(orderId)}`
}

function handoffToCheckout(checkoutUrl: string) {
  if (typeof window === 'undefined') return
  window.open(checkoutUrl, '_self')
}

export function useEcosystemPaymentInitiate(input: EcosystemPaymentInitiateInput) {
  const { authRequest } = useAuth()
  const slug = appConfig.publicEcosystemSlug
  const ecosystemQuery = useQuery({
    queryKey: ['public-ecosystem', slug],
    queryFn: () => publicEcosystemAdapter.getEcosystem(slug),
    enabled: !input.ecosystemId
  })

  const resolvedEcosystemId = input.ecosystemId ?? ecosystemQuery.data?.id ?? null
  const isPayable = input.orderStatus === 'PENDING_PAYMENT'

  const mutation = useMutation({
    mutationFn: async () => {
      if (!resolvedEcosystemId) throw new Error('No se pudo resolver el ecosystem actual.')
      const returnUrl = buildReturnUrl(input.orderId, input.returnPath)
      if (!returnUrl) throw new Error('No se pudo resolver la URL de retorno del pago.')
      return paymentAdapter.initiateEcosystemPayment({
        ecosystemId: resolvedEcosystemId,
        orderId: input.orderId,
        provider: PAYMENT_PROVIDER,
        returnUrl
      }, authRequest)
    },
    onSuccess: (paymentIntent) => {
      handoffToCheckout(paymentIntent.checkoutUrl)
    }
  })

  return {
    isPayable,
    resolvedEcosystemId,
    paymentIntent: mutation.data ?? null,
    isLoading: ecosystemQuery.isLoading || mutation.isPending,
    error: ecosystemQuery.error
      ? mapPaymentError(ecosystemQuery.error)
      : mutation.error
        ? mapPaymentError(mutation.error)
        : null,
    initiatePayment: async () => {
      if (!isPayable) return null
      return mutation.mutateAsync()
    }
  }
}
