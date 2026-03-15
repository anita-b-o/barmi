import { Button, EmptyState } from '../../../../design-system/components'
import { SectionCard } from '../../../../design-system/patterns'
import { theme } from '../../../../app/theme'
import { formatMoney } from '../../../../ui/utils/format'
import type { EcosystemCheckoutCartItemViewModel } from '../types'

type EcosystemCheckoutCartSummaryProps = {
  items: EcosystemCheckoutCartItemViewModel[]
  onIncrease: (item: EcosystemCheckoutCartItemViewModel) => void
  onDecrease: (externalProductId: string) => void
}

export function EcosystemCheckoutCartSummary({
  items,
  onIncrease,
  onDecrease
}: EcosystemCheckoutCartSummaryProps) {
  return (
    <SectionCard title="Carrito ecosystem">
      {items.length === 0 ? (
        <EmptyState title="Carrito vacío" description="Agregá productos externos desde el catálogo." />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          {items.map((item) => (
            <div
              key={item.externalProductId}
              style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'center' }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>
                  {formatMoney(item.unitPriceAmount, item.currency)} por unidad
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button variant="secondary" onClick={() => onDecrease(item.externalProductId)}>-</Button>
                <strong style={{ minWidth: 24, textAlign: 'center' }}>{item.qty}</strong>
                <Button variant="secondary" onClick={() => onIncrease(item)}>+</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
