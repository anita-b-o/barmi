import { OrderSummary, SectionCard } from '../../../../design-system/patterns'
import { Button } from '../../../../design-system/components'
import { formatMoney } from '../../../../ui/utils/format'
import type { EcosystemCheckoutPreview } from '../types'

type EcosystemCheckoutOrderSummaryProps = {
  preview: EcosystemCheckoutPreview
  isSubmitting: boolean
  onSubmit: () => void
}

export function EcosystemCheckoutOrderSummary({
  preview,
  isSubmitting,
  onSubmit
}: EcosystemCheckoutOrderSummaryProps) {
  return (
    <SectionCard title="Resumen de orden">
      <div style={{ display: 'grid', gap: 16 }}>
        <OrderSummary
          rows={[
            { label: 'Subtotal', value: formatMoney(preview.subtotalAmount, preview.currency) },
            { label: 'Envío', value: formatMoney(preview.shippingCostAmount, preview.currency) },
            { label: 'Total', value: formatMoney(preview.totalAmount, preview.currency) }
          ]}
        />
        <Button onClick={onSubmit} disabled={isSubmitting || preview.items.length === 0}>
          {isSubmitting ? 'Creando orden...' : 'Crear orden ecosystem'}
        </Button>
      </div>
    </SectionCard>
  )
}
