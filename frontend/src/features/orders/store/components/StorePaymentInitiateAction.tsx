import { PaymentInitiateAction } from '@/components/commerce'
import { formatMoney } from '@/core/utils/format'
import { useStorePaymentInitiate } from '../hooks/useStorePaymentInitiate'

type StorePaymentInitiateActionProps = {
  orderId: string
  orderStatus: string
  totalAmount: number
  currency: string
}

export function StorePaymentInitiateAction({
  orderId,
  orderStatus,
  totalAmount,
  currency
}: StorePaymentInitiateActionProps) {
  const payment = useStorePaymentInitiate({
    orderId,
    orderStatus
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
    />
  )
}
