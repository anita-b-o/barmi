import Button from '@/components/primitives/Button'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { theme } from '@/app/theme'

type PaymentInitiateActionProps = {
  isPayable: boolean
  unavailableMessage: string
  error?: string | null
  isLoading: boolean
  description: string
  onInitiate: () => void
  actionLabel?: string
  loadingLabel?: string
  disabled?: boolean
}

export default function PaymentInitiateAction({
  isPayable,
  unavailableMessage,
  error,
  isLoading,
  description,
  onInitiate,
  actionLabel = 'Reintentar pago',
  loadingLabel = 'Iniciando pago...',
  disabled = false
}: PaymentInitiateActionProps) {
  if (!isPayable) {
    return <div style={{ color: theme.colors.textMuted }}>{unavailableMessage}</div>
  }

  return (
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
      {error ? <ErrorAlert message={error} /> : null}
      {isLoading ? <LoadingBlock label={loadingLabel} /> : null}
      <div style={{ color: theme.colors.textMuted }}>{description}</div>
      <div>
        <Button onClick={onInitiate} disabled={isLoading || disabled}>
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
