import { PaymentInitiateAction } from '@/components/commerce'
import { formatMoney } from '@/core/utils/format'
import { useEcosystemPaymentInitiate } from '../hooks/useEcosystemPaymentInitiate'

type EcosystemPaymentInitiateActionProps = {
  orderId: string
  orderStatus: string
  ecosystemId?: string | null
  totalAmount: number
  currency: string
  returnPath?: string
}

export function EcosystemPaymentInitiateAction({
  orderId,
  orderStatus,
  ecosystemId,
  totalAmount,
  currency,
  returnPath
}: EcosystemPaymentInitiateActionProps) {
  const payment = useEcosystemPaymentInitiate({
    orderId,
    orderStatus,
    ecosystemId,
    returnPath
  })

  return (
    <PaymentInitiateAction
      isPayable={payment.isPayable}
      unavailableMessage={orderStatus === 'PAID'
        ? 'El pago ya fue confirmado para esta orden.'
        : orderStatus === 'CANCELLED'
          ? 'La orden fue cancelada y ya no admite pago.'
          : 'La orden no es pagable en su estado actual.'}
      error={payment.error}
      isLoading={payment.isLoading}
      description={`La orden sigue pendiente. Podés reintentar el pago por ${formatMoney(totalAmount, currency)} y se redirigirá al checkout externo.`}
      onInitiate={() => payment.initiatePayment()}
      disabled={!payment.resolvedEcosystemId}
    />
  )
}
