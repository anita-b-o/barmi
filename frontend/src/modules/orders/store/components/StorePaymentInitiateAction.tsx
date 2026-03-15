import { Button, ErrorAlert, LoadingBlock } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatMoney } from '../../../../ui/utils/format'
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

  if (!payment.isPayable) {
    const message = orderStatus === 'PAID'
      ? 'El pago ya fue confirmado para esta orden.'
      : orderStatus === 'CANCELLED'
        ? 'La orden fue cancelada y ya no admite pago.'
        : 'La orden no es pagable en su estado actual.'

    return <div style={{ color: theme.colors.textMuted }}>{message}</div>
  }

  return (
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
      {payment.error ? <ErrorAlert message={payment.error} /> : null}
      {payment.isLoading ? <LoadingBlock label="Iniciando pago..." /> : null}
      <div style={{ color: theme.colors.textMuted }}>
        La orden sigue pendiente. Podés reintentar el pago por {formatMoney(totalAmount, currency)} y se redirigirá al checkout externo.
      </div>
      <div>
        <Button onClick={() => payment.initiatePayment()} disabled={payment.isLoading}>
          Reintentar pago
        </Button>
      </div>
    </div>
  )
}
