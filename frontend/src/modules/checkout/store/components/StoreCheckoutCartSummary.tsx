import { Link } from 'react-router-dom'
import { Card, Button, EmptyState } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatMoneyFromCents } from '../../../../ui/utils/format'
import type { StoreCartItemViewModel } from '../types'

type StoreCheckoutCartSummaryProps = {
  items: StoreCartItemViewModel[]
  subtotalCents: number
  backToStoreHref: string
  onDecrease: (productId: string) => void
  onIncrease: (item: StoreCartItemViewModel) => void
}

export function StoreCheckoutCartSummary({
  items,
  subtotalCents,
  backToStoreHref,
  onDecrease,
  onIncrease
}: StoreCheckoutCartSummaryProps) {
  return (
    <Card variant="soft">
      {items.length === 0 ? (
        <EmptyState title="Carrito vacío." description="Agregá productos antes de continuar al checkout." />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          {items.map((item) => (
            <div
              key={item.productId}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.lg }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ color: theme.colors.textMuted }}>
                  {item.qty} x {formatMoneyFromCents(item.priceCents)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button variant="secondary" onClick={() => onDecrease(item.productId)}>
                  -
                </Button>
                <span style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                <Button variant="secondary" onClick={() => onIncrease(item)}>
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: theme.spacing.lg, fontWeight: 700 }}>
        Subtotal: {formatMoneyFromCents(subtotalCents)}
      </div>
      <div style={{ marginTop: theme.spacing.lg }}>
        <Link to={backToStoreHref} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
          Volver a la tienda
        </Link>
      </div>
    </Card>
  )
}
