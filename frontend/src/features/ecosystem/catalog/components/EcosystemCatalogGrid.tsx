import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import { theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { formatMoney } from '@/core/utils/format'
import type { PublicEcosystem, PublicEcosystemProduct } from '../../../../api/contracts/v1/public'

type EcosystemCatalogGridProps = {
  ecosystem: PublicEcosystem
  products: PublicEcosystemProduct[]
  cartQtyByProductId: Record<string, number>
  onAddProduct: (product: PublicEcosystemProduct) => void
}

export function EcosystemCatalogGrid({ ecosystem, products, cartQtyByProductId, onAddProduct }: EcosystemCatalogGridProps) {
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const isTablet = viewportMode === 'tablet'

  return (
    <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${isMobile ? 168 : isTablet ? 198 : 228}px), 1fr))` }}>
      {products.map((product) => {
        const cartQty = cartQtyByProductId[product.id] ?? 0
        const isInCart = cartQty > 0

        return (
          <Card
            key={product.id}
            style={{
              padding: 0,
              display: 'grid',
              gridTemplateRows: `${isMobile ? 118 : 132}px auto`,
              minHeight: '100%',
              borderColor: isInCart ? theme.colors.borderAccentSoft : theme.colors.borderDefault,
              background: theme.colors.bgSurfaceAlt,
              boxShadow: 'none'
            }}
          >
            <div
              style={{
                position: 'relative',
                padding: isMobile ? theme.spacing.md : theme.spacing.lg,
                background: isInCart ? theme.colors.bgSelected : theme.colors.bgHover,
                borderBottom: `1px solid ${theme.colors.borderDefault}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: theme.spacing.sm
              }}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                <Badge variant="neutral" style={{ color: theme.colors.textPrimary, background: theme.colors.bgHover }}>{ecosystem.name}</Badge>
                {isInCart ? <Badge variant="success">En carrito: {cartQty}</Badge> : null}
              </div>
              <div
                aria-hidden="true"
                style={{
                  alignSelf: 'stretch',
                  flex: 1,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${isInCart ? theme.colors.borderAccentSoft : theme.colors.borderDefault}`,
                  background: theme.colors.bgSurfaceAlt,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '10px 12px' : '12px 14px',
                  color: theme.colors.textPrimary,
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'grid', gap: 4 }}>
                  <div
                    style={{
                      width: isMobile ? 34 : 40,
                      height: isMobile ? 34 : 40,
                      borderRadius: 12,
                      background: theme.colors.bgHover,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 4,
                      padding: 6
                    }}
                  >
                    <span style={{ borderRadius: 4, background: theme.colors.borderAccentSoft }} />
                    <span style={{ borderRadius: 4, background: theme.colors.borderDefault }} />
                    <span style={{ borderRadius: 4, background: theme.colors.borderDefault }} />
                    <span style={{ borderRadius: 4, background: theme.colors.borderAccentSoft }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 4, justifyItems: 'end', textAlign: 'right' }}>
                  <div style={{ fontSize: theme.typography.small.size, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase' }}>
                    Producto externo
                  </div>
                  <div style={{ fontSize: theme.typography.small.size, color: theme.colors.textMuted }}>
                    Compra desde ecosystem
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: isMobile ? theme.spacing.sm : theme.spacing.md, padding: isMobile ? theme.spacing.md : theme.spacing.lg }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge variant={product.deliverySupported ? 'success' : 'neutral'}>
                    {product.deliverySupported ? 'Entrega disponible' : 'Sin entrega'}
                  </Badge>
                  {isInCart ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: theme.radius.pill,
                        padding: '4px 10px',
                        background: theme.colors.bgAccentSoft,
                        color: theme.colors.brand,
                        fontSize: theme.typography.small.size,
                        fontWeight: 700
                      }}
                    >
                      {cartQty} en carrito
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div
                    style={{
                      fontSize: isMobile ? 15 : 16,
                      fontWeight: 650,
                      lineHeight: 1.3,
                      letterSpacing: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      minHeight: isMobile ? 39 : 42
                    }}
                  >
                    {product.name}
                  </div>
                  <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
                    {ecosystem.name}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: theme.spacing.sm
                }}
              >
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: isMobile ? 23 : 26, fontWeight: 800, letterSpacing: 0, color: theme.colors.textPrimary, lineHeight: 1.05 }}>
                    {formatMoney(product.priceAmount, product.currency)}
                  </div>
                  <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
                    Se suma al carrito ecosystem
                  </div>
                </div>
                <Button
                  variant={isInCart ? 'secondary' : 'primary'}
                  onClick={() => onAddProduct(product)}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    padding: isMobile ? '11px 14px' : '12px 16px',
                    fontSize: isMobile ? 14 : theme.typography.body.size
                  }}
                >
                  {isInCart ? 'Agregar otra unidad' : 'Agregar al carrito'}
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
