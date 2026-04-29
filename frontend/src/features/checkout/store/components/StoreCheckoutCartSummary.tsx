import { Link } from 'react-router-dom'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import EmptyState from '@/components/feedback/EmptyState'
import { QuantitySelector } from '@/components/commerce'
import { alpha, theme } from '@/app/theme'
import { formatMoneyFromCents } from '@/core/utils/format'
import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import LoadingBlock from '@/components/feedback/LoadingState'
import type { StoreCartItemViewModel } from '../types'
import { useViewportMode } from '@/core/hooks/useViewportMode'

type StoreCheckoutCartSummaryProps = {
  items: StoreCartItemViewModel[]
  subtotalCents: number
  backToStoreHref: string
  onDecrease: (productId: string) => void
  onIncrease: (item: StoreCartItemViewModel) => void
  onSetQuantity: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  isAvailabilityLoading?: boolean
  availabilityError?: string | null
}

export function StoreCheckoutCartSummary({
  items,
  subtotalCents,
  backToStoreHref,
  onDecrease,
  onIncrease,
  onSetQuantity,
  onRemove,
  isAvailabilityLoading = false,
  availabilityError = null
}: StoreCheckoutCartSummaryProps) {
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'

  return (
    <Card variant="soft" style={{ borderColor: theme.colors.borderDefault }}>
      {items.length === 0 ? (
        <EmptyState title="Carrito vacío." description="Agregá productos antes de continuar al checkout." />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.lg }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              background: theme.colors.bgSurfaceAlt,
              border: `1px solid ${theme.colors.borderDefault}`
            }}
          >
            <div style={{ display: 'grid', gap: theme.spacing.xs }}>
              <div style={{ fontWeight: 700 }}>Tu pedido</div>
              <div style={{ color: theme.colors.textMuted }}>
                Ajustá cantidades acá mismo y revisá disponibilidad antes de avanzar.
              </div>
            </div>
            <Badge variant="info">{items.length} {items.length === 1 ? 'producto' : 'productos'}</Badge>
          </div>

          {isAvailabilityLoading ? <LoadingBlock label="Validando disponibilidad actual..." /> : null}
          {availabilityError ? (
            <div
              style={{
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                background: alpha(theme.colors.error, 0.1),
                border: `1px solid ${alpha(theme.colors.error, 0.2)}`,
                color: theme.colors.error
              }}
            >
              {availabilityError}
            </div>
          ) : null}

          {items.map((item) => (
            <div
              key={item.productId}
              style={{
                display: 'grid',
                gap: theme.spacing.md,
                padding: isMobile ? theme.spacing.md : theme.spacing.lg,
                borderRadius: theme.radius.md,
                background: theme.colors.bgSurfaceAlt,
                border: `1px solid ${item.isAvailable === false || (typeof item.stockQuantity === 'number' && item.stockQuantity < item.qty)
                  ? alpha(theme.colors.error, 0.28)
                  : theme.colors.borderDefault}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                    {item.isAvailable === false || (typeof item.stockQuantity === 'number' && item.stockQuantity < item.qty) ? (
                      <Badge variant="error">Revisar stock</Badge>
                    ) : typeof item.stockQuantity === 'number' ? (
                      <Badge variant="success">Disponible</Badge>
                    ) : null}
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>
                    {formatMoneyFromCents(item.priceCents)} por unidad
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>
                    Total del item: {formatMoneyFromCents(item.priceCents * item.qty)}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => onRemove(item.productId)}>
                  Eliminar
                </Button>
              </div>

                <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: isMobile ? '1fr' : 'minmax(120px, 160px) auto', alignItems: 'end' }}>
                <div style={{ display: 'grid', gap: 6, minWidth: 120 }}>
                  <div style={{ fontSize: theme.typography.small.size, color: theme.colors.textMuted }}>Cantidad</div>
                  <Input
                    type="number"
                    min={1}
                    value={String(item.qty)}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      if (Number.isNaN(nextValue)) return
                      onSetQuantity(item.productId, Math.max(1, Math.floor(nextValue)))
                    }}
                  />
                </div>
                <QuantitySelector
                  value={item.qty}
                  onDecrease={() => onDecrease(item.productId)}
                  onIncrease={() => onIncrease(item)}
                />
              </div>

              <div
                style={{
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  background: item.isAvailable === false || (typeof item.stockQuantity === 'number' && item.stockQuantity < item.qty)
                    ? alpha(theme.colors.error, 0.1)
                    : theme.colors.bgSurface
                }}
              >
                {item.isAvailable === false ? (
                  <div style={{ color: theme.colors.error, fontWeight: 600 }}>
                    Sin stock. Quitá este producto o ajustá el carrito antes de confirmar.
                  </div>
                ) : typeof item.stockQuantity === 'number' && item.stockQuantity < item.qty ? (
                  <div style={{ color: theme.colors.error, fontWeight: 600 }}>
                    Stock actual insuficiente. Hay {item.stockQuantity} unidades disponibles y pediste {item.qty}.
                  </div>
                ) : typeof item.stockQuantity === 'number' ? (
                  <div style={{ color: theme.colors.success, fontWeight: 600 }}>
                    Disponible ahora. Stock visible: {item.stockQuantity}.
                  </div>
                ) : (
                  <div style={{ color: theme.colors.textMuted }}>
                    La disponibilidad exacta se valida al confirmar el checkout.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: theme.spacing.xl, display: 'grid', gap: theme.spacing.sm }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing.lg,
            alignItems: 'center',
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            background: theme.colors.bgSurfaceAlt,
            border: `1px solid ${theme.colors.borderDefault}`
          }}
        >
          <span style={{ color: theme.colors.textMuted }}>Subtotal actual</span>
          <strong style={{ fontSize: theme.typography.title.size }}>{formatMoneyFromCents(subtotalCents)}</strong>
        </div>
        <div style={{ color: theme.colors.textMuted }}>
          El total final puede ajustarse por envío y cupón antes de crear la orden.
        </div>
        <div>
          <Link to={backToStoreHref} style={{ color: theme.colors.actionPrimary, textDecoration: 'none' }}>
            Volver a la tienda
          </Link>
        </div>
      </div>
    </Card>
  )
}
