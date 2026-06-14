import type { CSSProperties } from 'react'
import EmptyState from '@/components/feedback/EmptyState'
import { QuantitySelector } from '@/components/commerce'
import Badge from '@/components/primitives/Badge'
import Card from '@/components/primitives/Card'
import { theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { formatMoney } from '@/core/utils/format'
import type { EcosystemCheckoutCartItemViewModel } from '../types'

type EcosystemCheckoutCartSummaryProps = {
  items: EcosystemCheckoutCartItemViewModel[]
  subtotalAmount: number
  onIncrease: (item: EcosystemCheckoutCartItemViewModel) => void
  onDecrease: (externalProductId: string) => void
}

const cartSummaryStyles = {
  cardMobile: {
    display: 'grid',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderColor: theme.colors.borderDefault
  },
  cardDesktop: {
    display: 'grid',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderColor: theme.colors.borderDefault
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  titleStack: { display: 'grid', gap: 6 },
  title: {
    fontSize: theme.typography.title.size,
    fontWeight: 700,
    letterSpacing: 0,
    color: theme.colors.textPrimary
  },
  description: { color: theme.colors.textMuted, lineHeight: 1.5, maxWidth: 720 },
  list: { display: 'grid', gap: theme.spacing.lg },
  itemShell: {
    display: 'grid',
    gap: theme.spacing.md,
    padding: 0,
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  mediaWrap: {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  media: {
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
  },
  itemBodyMobile: {
    display: 'grid',
    gap: theme.spacing.lg,
    gridTemplateColumns: '1fr',
    alignItems: 'flex-start',
    padding: theme.spacing.lg
  },
  itemBodyDesktop: {
    display: 'grid',
    gap: theme.spacing.lg,
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'flex-start',
    padding: theme.spacing.xl
  },
  itemDetails: { display: 'grid', gap: 4 },
  badgeRow: { display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  itemName: { fontWeight: 700, fontSize: 18, letterSpacing: 0, overflowWrap: 'anywhere' },
  mutedText: { color: theme.colors.textMuted },
  actionsMobile: { display: 'grid', gap: theme.spacing.md, marginLeft: 0 },
  actionsDesktop: { display: 'grid', gap: theme.spacing.md, marginLeft: 'auto' },
  subtotalMobile: { display: 'grid', gap: 4, textAlign: 'left' },
  subtotalDesktop: { display: 'grid', gap: 4, textAlign: 'right' },
  subtotalLabel: { fontSize: theme.typography.small.size, color: theme.colors.textMuted, fontWeight: 600 },
  subtotalValue: { fontSize: theme.typography.title.size, fontWeight: 700, color: theme.colors.textPrimary },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${theme.colors.borderDefault}`,
    flexWrap: 'wrap'
  },
  totalCopy: { display: 'grid', gap: 4 },
  totalHint: { color: theme.colors.textMuted, fontSize: theme.typography.small.size }
} satisfies Record<string, CSSProperties>

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
      style={isMobile ? cartSummaryStyles.cardMobile : cartSummaryStyles.cardDesktop}
    >
      <div
        style={cartSummaryStyles.header}
      >
        <div style={cartSummaryStyles.titleStack}>
          <div style={cartSummaryStyles.title}>
            1. Productos
          </div>
          <div style={cartSummaryStyles.description}>
            Productos externos del ecosystem.
          </div>
        </div>
        <Badge variant="neutral">{items.length} {items.length === 1 ? 'item' : 'items'}</Badge>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Carrito vacío" description="Agregá productos externos desde el catálogo." />
      ) : (
        <div style={cartSummaryStyles.list}>
          {items.map((item) => (
            <div
              key={item.externalProductId}
              style={cartSummaryStyles.itemShell}
            >
              <div
                style={cartSummaryStyles.mediaWrap}
              >
                <div
                  aria-hidden="true"
                  style={cartSummaryStyles.media}
                >
                  Ecosystem item
                </div>
              </div>
              <div
                style={isMobile ? cartSummaryStyles.itemBodyMobile : cartSummaryStyles.itemBodyDesktop}
              >
                <div style={cartSummaryStyles.itemDetails}>
                  <div style={cartSummaryStyles.badgeRow}>
                    <Badge variant="neutral">Externo</Badge>
                    <Badge variant={item.deliverySupported === false ? 'warning' : 'success'}>
                      {item.deliverySupported === false ? 'Sin entrega' : 'Entrega disponible'}
                    </Badge>
                  </div>
                  <div style={cartSummaryStyles.itemName}>{item.name}</div>
                  <div style={cartSummaryStyles.mutedText}>
                    {formatMoney(item.unitPriceAmount, item.currency)} por unidad
                  </div>
                  <div style={cartSummaryStyles.mutedText}>
                    Total del item: {formatMoney(item.unitPriceAmount * item.qty, item.currency)}
                  </div>
                </div>

                <div style={isMobile ? cartSummaryStyles.actionsMobile : cartSummaryStyles.actionsDesktop}>
                  <div style={isMobile ? cartSummaryStyles.subtotalMobile : cartSummaryStyles.subtotalDesktop}>
                    <div style={cartSummaryStyles.subtotalLabel}>
                      Subtotal
                    </div>
                    <div style={cartSummaryStyles.subtotalValue}>
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
            style={cartSummaryStyles.totalRow}
          >
            <div style={cartSummaryStyles.totalCopy}>
              <span style={cartSummaryStyles.mutedText}>Subtotal actual</span>
              <span style={cartSummaryStyles.totalHint}>
                El total final puede cambiar con envío o cupón.
              </span>
            </div>
            <strong style={cartSummaryStyles.subtotalValue}>
              {formatMoney(subtotalAmount, items[0]?.currency ?? 'ARS')}
            </strong>
          </div>
        </div>
      )}
    </Card>
  )
}
