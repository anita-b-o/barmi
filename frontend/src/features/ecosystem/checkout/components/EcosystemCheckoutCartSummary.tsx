import EmptyState from '@/components/feedback/EmptyState'
import { QuantitySelector } from '@/components/commerce'
import Badge from '@/components/primitives/Badge'
import Card from '@/components/primitives/Card'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { formatMoney } from '@/core/utils/format'
import type { EcosystemCheckoutCartItemViewModel } from '../types'

type EcosystemCheckoutCartSummaryProps = {
  items: EcosystemCheckoutCartItemViewModel[]
  subtotalAmount: number
  onIncrease: (item: EcosystemCheckoutCartItemViewModel) => void
  onDecrease: (externalProductId: string) => void
}

export function EcosystemCheckoutCartSummary({
  items,
  subtotalAmount,
  onIncrease,
  onDecrease
}: EcosystemCheckoutCartSummaryProps) {
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'

  return (
    <Card
      style={{
        display: 'grid',
        gap: theme.spacing.lg,
        padding: isMobile ? theme.spacing.lg : theme.spacing.xl,
        borderColor: theme.colors.borderDefault
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: theme.spacing.lg,
          alignItems: 'flex-start',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary }}>
            1. Productos
          </div>
          <div style={{ color: theme.colors.textMuted, lineHeight: 1.5, maxWidth: 720 }}>
            Productos externos del ecosystem.
          </div>
        </div>
        <Badge variant="neutral">{items.length} {items.length === 1 ? 'item' : 'items'}</Badge>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Carrito vacío" description="Agregá productos externos desde el catálogo." />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.lg }}>
          {items.map((item) => (
            <div
              key={item.externalProductId}
              style={{
                display: 'grid',
                gap: theme.spacing.md,
                padding: 0,
                overflow: 'hidden',
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.borderDefault}`,
                background: theme.colors.bgSurfaceAlt
              }}
            >
              <div
                style={{
                  padding: theme.spacing.lg,
                  borderBottom: `1px solid ${theme.colors.borderDefault}`,
                  background: theme.colors.bgSurfaceAlt
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    minHeight: 92,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.borderDefault}`,
                    background: theme.colors.bgSurfaceAlt,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.colors.textPrimary,
                    fontWeight: 700,
                    letterSpacing: 0,
                    textTransform: 'uppercase'
                  }}
                >
                  Ecosystem item
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: theme.spacing.lg,
                  gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto',
                  alignItems: 'flex-start',
                  padding: isMobile ? theme.spacing.lg : theme.spacing.xl
                }}
              >
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <Badge variant="neutral">Externo</Badge>
                    <Badge variant={item.deliverySupported === false ? 'warning' : 'success'}>
                      {item.deliverySupported === false ? 'Sin entrega' : 'Entrega disponible'}
                    </Badge>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0, overflowWrap: 'anywhere' }}>{item.name}</div>
                  <div style={{ color: theme.colors.textMuted }}>
                    {formatMoney(item.unitPriceAmount, item.currency)} por unidad
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>
                    Total del item: {formatMoney(item.unitPriceAmount * item.qty, item.currency)}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: theme.spacing.md, marginLeft: isMobile ? 0 : 'auto' }}>
                  <div style={{ display: 'grid', gap: 4, textAlign: isMobile ? 'left' : 'right' }}>
                    <div style={{ fontSize: theme.typography.small.size, color: theme.colors.textMuted, fontWeight: 600 }}>
                      Subtotal
                    </div>
                    <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, color: theme.colors.textPrimary }}>
                      {formatMoney(item.unitPriceAmount * item.qty, item.currency)}
                    </div>
                  </div>
                  <QuantitySelector
                    value={item.qty}
                    onDecrease={() => onDecrease(item.externalProductId)}
                    onIncrease={() => onIncrease(item)}
                  />
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: theme.spacing.lg,
              alignItems: 'center',
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              background: theme.colors.bgSurfaceAlt,
              border: `1px solid ${theme.colors.borderDefault}`,
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={{ color: theme.colors.textMuted }}>Subtotal actual</span>
              <span style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
                El total final puede cambiar con envío o cupón.
              </span>
            </div>
            <strong style={{ fontSize: theme.typography.title.size, color: theme.colors.textPrimary }}>
              {formatMoney(subtotalAmount, items[0]?.currency ?? 'ARS')}
            </strong>
          </div>
        </div>
      )}
    </Card>
  )
}
