import { useMutation } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { routes } from '../../../../core/constants/routes'
import { paymentAdapter } from '../../../../api/adapters/paymentAdapter'

const PAYMENT_PROVIDER = 'MERCADOPAGO'

function mapPaymentError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'order_not_payable') return 'La orden ya no está disponible para pago.'
    if (code === 'store_order_not_found') return 'La orden STORE no existe.'
    if (code === 'store_context_required') return 'No se pudo resolver la store actual para iniciar el pago.'
    if (code === 'payment_provider_unavailable') return 'El proveedor de pago no está disponible en este momento.'
  }
  return extractBackendErrorMessage(error, 'No se pudo iniciar el pago.')
}

function buildReturnUrl(orderId: string) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${routes.storeOrderDetailPath(orderId)}`
}

function handoffToCheckout(checkoutUrl: string) {
  if (typeof window === 'undefined') return
  window.open(checkoutUrl, '_self')
}

type StorePaymentInitiateInput = {
  orderId: string
  orderStatus: string
}

export function useStorePaymentInitiate(input: StorePaymentInitiateInput) {
  const isPayable = input.orderStatus === 'PENDING_PAYMENT'

  const mutation = useMutation({
    mutationFn: async () => {
      const returnUrl = buildReturnUrl(input.orderId)
      if (!returnUrl) throw new Error('No se pudo resolver la URL de retorno del pago.')
      return paymentAdapter.initiateStorePayment({
        orderId: input.orderId,
        provider: PAYMENT_PROVIDER,
        returnUrl
      })
    },
    onSuccess: (paymentIntent) => {
      handoffToCheckout(paymentIntent.checkoutUrl)
    }
  })

  return {
    isPayable,
    paymentIntent: mutation.data ?? null,
    isLoading: mutation.isPending,
    error: mutation.error ? mapPaymentError(mutation.error) : null,
    initiatePayment: async () => {
      if (!isPayable) return null
      return mutation.mutateAsync()
    }
  }
}
