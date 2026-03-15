import { Button, Card, StatusBadge } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatDate, formatMoney } from '../../../../ui/utils/format'
import type { StoreCheckoutPreview, StoreCheckoutSuccessState } from '../types'

type StoreCheckoutOrderSummaryProps = {
  preview: StoreCheckoutPreview
  isSubmitting: boolean
  onSubmit: () => void
  successState: StoreCheckoutSuccessState | null
}

export function StoreCheckoutOrderSummary({
  preview,
  isSubmitting,
  onSubmit,
  successState
}: StoreCheckoutOrderSummaryProps) {
  return (
    <Card>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>Subtotal</span>
          <strong>{formatMoney(preview.subtotalAmount, preview.currency)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>Envío</span>
          <strong>{formatMoney(preview.shippingCostAmount, preview.currency)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>Total</span>
          <strong>{formatMoney(preview.totalAmount, preview.currency)}</strong>
        </div>

        <Button onClick={onSubmit} disabled={isSubmitting || preview.items.length === 0 || !preview.postalCode.trim()}>
          {isSubmitting ? 'Creando orden...' : 'Crear orden'}
        </Button>

        {successState && (
          <div
            style={{
              borderTop: `1px solid ${theme.colors.border}`,
              paddingTop: theme.spacing.lg,
              display: 'grid',
              gap: theme.spacing.sm
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
              <span style={{ color: theme.colors.textMuted }}>Orden</span>
              <strong>{successState.order.orderId}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
              <span style={{ color: theme.colors.textMuted }}>Estado</span>
              <StatusBadge status={successState.order.status} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
              <span style={{ color: theme.colors.textMuted }}>Creada</span>
              <strong>{formatDate(successState.order.createdAt)}</strong>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
