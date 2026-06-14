import React from 'react'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import StatusBadge from '@/components/commerce/StatusBadge'
import { theme } from '@/app/theme'

type SummaryRow = {
  label: string
  value: React.ReactNode
}

type SuccessState = {
  orderId: string
  status: string
  createdAtLabel: string
}

type CheckoutOrderSummaryProps = {
  rows: SummaryRow[]
  actionLabel: string
  onSubmit: () => void
  isSubmitting: boolean
  isDisabled?: boolean
  submittingLabel?: string
  successState?: SuccessState | null
  title?: string
  wrapInCard?: boolean
}

function CheckoutOrderSummaryContent({
  rows,
  actionLabel,
  onSubmit,
  isSubmitting,
  isDisabled = false,
  submittingLabel = 'Procesando...',
  successState,
  title
}: CheckoutOrderSummaryProps) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
      {title ? (
        <div style={{ fontSize: theme.typography.title.size, fontWeight: 600 }}>
          {title}
        </div>
      ) : null}

      {rows.map((row, index) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing.lg,
            paddingTop: index === rows.length - 1 ? theme.spacing.sm : 0,
            borderTop: index === rows.length - 1 ? `1px solid ${theme.colors.borderDefault}` : undefined
          }}
        >
          <span style={{ color: theme.colors.textMuted }}>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}

      <div
        style={{
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          background: theme.colors.bgSurfaceAlt,
          border: `1px solid ${theme.colors.borderDefault}`,
          color: theme.colors.textMuted
        }}
      >
        Revisá los importes antes de crear la orden. Después vas a poder continuar al pago con el total ya calculado.
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting || isDisabled}>
        {isSubmitting ? submittingLabel : actionLabel}
      </Button>

      {successState ? (
        <div
          style={{
            borderTop: `1px solid ${theme.colors.borderDefault}`,
            paddingTop: theme.spacing.lg,
            display: 'grid',
            gap: theme.spacing.sm
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Orden</span>
            <strong>{successState.orderId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Estado</span>
            <StatusBadge status={successState.status} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Creada</span>
            <strong>{successState.createdAtLabel}</strong>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function CheckoutOrderSummary(props: CheckoutOrderSummaryProps) {
  if (props.wrapInCard === false) {
    return <CheckoutOrderSummaryContent {...props} />
  }

  return (
    <Card>
      <CheckoutOrderSummaryContent {...props} />
    </Card>
  )
}
