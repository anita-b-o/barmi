import type { CSSProperties } from 'react'
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
    <Card variant="soft" style={cartSummaryCardStyle}>
      {items.length === 0 ? (
        <EmptyState title="Carrito vacío." description="Agregá productos antes de continuar al checkout." />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.lg }}>
          <div style={cartSummaryHeaderStyle}>
            <div style={{ display: 'grid', gap: theme.spacing.xs }}>
              <div style={{ fontWeight: 700 }}>Tu pedido</div>
              <div style={cartSummaryMutedTextStyle}>
                Ajustá cantidades acá mismo y revisá disponibilidad antes de avanzar.
              </div>
            </div>
            <Badge variant="info">{items.length} {items.length === 1 ? 'producto' : 'productos'}</Badge>
          </div>

          {isAvailabilityLoading ? <LoadingBlock label="Validando disponibilidad actual..." /> : null}
          {availabilityError ? (
            <div style={cartSummaryErrorAlertStyle}>
              {availabilityError}
            </div>
          ) : null}

          {items.map((item) => {
            const hasStockIssue = item.isAvailable === false || (typeof item.stockQuantity === 'number' && item.stockQuantity < item.qty)

            return (
              <div
                key={item.productId}
                style={getCartItemStyle(isMobile, hasStockIssue)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      {hasStockIssue ? (
                        <Badge variant="error">Revisar stock</Badge>
                      ) : typeof item.stockQuantity === 'number' ? (
                        <Badge variant="success">Disponible</Badge>
                      ) : null}
                    </div>
                    <div style={cartSummaryMutedTextStyle}>
                      {formatMoneyFromCents(item.priceCents)} por unidad
                    </div>
                    <div style={cartSummaryMutedTextStyle}>
                      Total del item: {formatMoneyFromCents(item.priceCents * item.qty)}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => onRemove(item.productId)}>
                    Eliminar
                  </Button>
                </div>

                <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: isMobile ? '1fr' : 'minmax(120px, 160px) auto', alignItems: 'end' }}>
                  <div style={{ display: 'grid', gap: 6, minWidth: 120 }}>
                    <div style={cartSummaryFieldLabelStyle}>Cantidad</div>
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

                <div style={getStockMessageContainerStyle(hasStockIssue)}>
                  {item.isAvailable === false ? (
                    <div style={cartSummaryErrorTextStyle}>
                      Sin stock. Quitá este producto o ajustá el carrito antes de confirmar.
                    </div>
                  ) : typeof item.stockQuantity === 'number' && item.stockQuantity < item.qty ? (
                    <div style={cartSummaryErrorTextStyle}>
                      Stock actual insuficiente. Hay {item.stockQuantity} unidades disponibles y pediste {item.qty}.
                    </div>
                  ) : typeof item.stockQuantity === 'number' ? (
                    <div style={cartSummarySuccessTextStyle}>
                      Disponible ahora. Stock visible: {item.stockQuantity}.
                    </div>
                  ) : (
                    <div style={cartSummaryMutedTextStyle}>
                      La disponibilidad exacta se valida al confirmar el checkout.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ marginTop: theme.spacing.xl, display: 'grid', gap: theme.spacing.sm }}>
        <div style={cartSummarySubtotalRowStyle}>
          <span style={cartSummaryMutedTextStyle}>Subtotal actual</span>
          <strong style={{ fontSize: theme.typography.title.size }}>{formatMoneyFromCents(subtotalCents)}</strong>
        </div>
        <div style={cartSummaryMutedTextStyle}>
          El total final puede ajustarse por envío y cupón antes de crear la orden.
        </div>
        <div>
          <Link to={backToStoreHref} style={cartSummaryLinkStyle}>
            Volver a la tienda
          </Link>
        </div>
      </div>
    </Card>
  )
}

const cartSummaryCardStyle: CSSProperties = {
  borderColor: theme.colors.borderDefault
}

const cartSummaryMutedTextStyle: CSSProperties = {
  color: theme.colors.textMuted
}

const cartSummaryHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: theme.spacing.md,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  padding: theme.spacing.md,
  borderRadius: theme.radius.md,
  background: theme.colors.bgSurfaceAlt,
  border: `1px solid ${theme.colors.borderDefault}`
}

const cartSummaryErrorAlertStyle: CSSProperties = {
  padding: theme.spacing.md,
  borderRadius: theme.radius.md,
  background: alpha(theme.colors.error, 0.1),
  border: `1px solid ${alpha(theme.colors.error, 0.2)}`,
  color: theme.colors.error
}

const cartSummaryFieldLabelStyle: CSSProperties = {
  ...cartSummaryMutedTextStyle,
  fontSize: theme.typography.small.size
}

const cartSummaryErrorTextStyle: CSSProperties = {
  color: theme.colors.error,
  fontWeight: 600
}

const cartSummarySuccessTextStyle: CSSProperties = {
  color: theme.colors.success,
  fontWeight: 600
}

const cartSummarySubtotalRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: theme.spacing.lg,
  alignItems: 'center',
  padding: theme.spacing.md,
  borderRadius: theme.radius.md,
  background: theme.colors.bgSurfaceAlt,
  border: `1px solid ${theme.colors.borderDefault}`
}

const cartSummaryLinkStyle: CSSProperties = {
  color: theme.colors.actionPrimary,
  textDecoration: 'none'
}

function getCartItemStyle(isMobile: boolean, hasStockIssue: boolean): CSSProperties {
  return {
    display: 'grid',
    gap: theme.spacing.md,
    padding: isMobile ? theme.spacing.md : theme.spacing.lg,
    borderRadius: theme.radius.md,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${hasStockIssue ? alpha(theme.colors.error, 0.28) : theme.colors.borderDefault}`
  }
}

function getStockMessageContainerStyle(hasStockIssue: boolean): CSSProperties {
  return {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    background: hasStockIssue ? alpha(theme.colors.error, 0.1) : theme.colors.bgSurface
  }
}
