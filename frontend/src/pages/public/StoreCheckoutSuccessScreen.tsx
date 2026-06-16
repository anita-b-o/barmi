import type { CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PublicStoreLayout } from '../../layouts'
import { theme } from '@/app/theme'
import { OrderSummary, StatusBadge } from '@/components/commerce'
import { Breadcrumbs, SectionCard } from '@/components/navigation'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import EmptyState from '@/components/feedback/EmptyState'
import { routes } from '@/core/constants/routes'
import { formatDate, formatMoney, formatMoneyFromCents } from '@/core/utils/format'
import type { StoreCheckoutSuccessState } from '@/features/checkout'
import { StorePaymentInitiateAction } from '@/features/orders'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemSurfaceSection } from '@/features/ecosystem'

const successScreenStyles = {
  pageStack: { display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  actionLink: { textDecoration: 'none' },
  mutedText: { color: theme.colors.textMuted },
  heroTotal: {
    fontSize: theme.typography.display.size,
    fontWeight: theme.typography.display.weight,
    color: theme.colors.textPrimary,
    lineHeight: 1
  },
  orderId: { color: theme.colors.textMuted, overflowWrap: 'anywhere' },
  metricsCard: {
    display: 'grid',
    gap: theme.spacing.md,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    background: theme.colors.bgSurfaceAlt
  },
  metricTile: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${theme.colors.borderDefault}`
  },
  metricLabel: { color: theme.colors.textMuted, marginBottom: 4 },
  metricMeta: { color: theme.colors.textMuted, marginTop: 4 },
  contentGrid: {
    display: 'grid',
    gap: theme.spacing.xl,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    alignItems: 'start'
  },
  columnStack: { display: 'grid', gap: theme.spacing.xl, minWidth: 0 },
  sectionStack: { display: 'grid', gap: theme.spacing.md },
  actionRow: { display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.borderDefault}`
  },
  itemName: { minWidth: 0, overflowWrap: 'anywhere' },
  itemTotal: { minWidth: 0, marginLeft: 'auto', textAlign: 'right' },
  economyStack: { display: 'grid', gap: theme.spacing.sm },
  economyRow: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg },
  economyTotal: { fontSize: theme.typography.title.size }
} satisfies Record<string, CSSProperties>

export default function StoreCheckoutSuccessScreen() {
  const location = useLocation()
  const successState = location.state as StoreCheckoutSuccessState | null
  const detailHref = successState ? routes.storeOrderDetailPath(successState.order.orderId) : routes.storeOrders
  const storeHref = successState?.storeSlug ? routes.publicStore(successState.storeSlug) : routes.storeOrders
  const hasDiscount = Boolean(successState && successState.order.discountAmount > 0)

  return (
    <PublicStoreLayout>
      <Breadcrumbs items={[{ label: 'Store', href: storeHref }, { label: 'Checkout' }, { label: 'Confirmación' }]} />

      {!successState ? (
        <EcosystemSurfaceSection>
          <EmptyState
            title="No hay una orden reciente para mostrar"
            description="Volvé al checkout o revisá el listado de órdenes."
          />
        </EcosystemSurfaceSection>
      ) : (
        <div style={successScreenStyles.pageStack}>
          <EcosystemHeroSection
            eyebrow="Orden creada"
            title="Gracias, tu pedido ya quedó creado"
            description={successState.order.status === 'PENDING_PAYMENT'
              ? 'La compra quedó registrada. Revisá el resumen, confirmá el total final y seguí al detalle para pagar o consultar el estado.'
              : 'La orden ya quedó registrada y podés seguirla desde el detalle público.'}
            badges={(
              <>
                <EcosystemHeroBadge variant="success">Compra registrada</EcosystemHeroBadge>
                {hasDiscount ? <EcosystemHeroBadge variant="info">Descuento aplicado</EcosystemHeroBadge> : null}
              </>
            )}
            actions={(
              <>
                <Link to={detailHref} style={successScreenStyles.actionLink}>
                  <Button>Ver detalle</Button>
                </Link>
                <Link to={routes.storeOrders} style={successScreenStyles.actionLink}>
                  <Button variant="secondary">Ver órdenes</Button>
                </Link>
                {successState.storeSlug ? (
                  <Link to={routes.publicStore(successState.storeSlug)} style={successScreenStyles.actionLink}>
                    <Button variant="ghost">Volver a la tienda</Button>
                  </Link>
                ) : null}
              </>
            )}
            aside={(
              <>
                <div style={successScreenStyles.mutedText}>Total final</div>
                <div style={successScreenStyles.heroTotal}>
                  {formatMoney(successState.order.totalAmount, successState.order.currency)}
                </div>
                <div style={successScreenStyles.orderId}>
                  Orden {successState.order.orderId}
                </div>
              </>
            )}
          />

          <Card
            variant="soft"
            style={successScreenStyles.metricsCard}
          >
            <div style={successScreenStyles.metricTile}>
              <div style={successScreenStyles.metricLabel}>Estado</div>
              <StatusBadge status={successState.order.status} />
            </div>
            <div style={successScreenStyles.metricTile}>
              <div style={successScreenStyles.metricLabel}>Creada</div>
              <strong>{formatDate(successState.order.createdAt)}</strong>
            </div>
            <div style={successScreenStyles.metricTile}>
              <div style={successScreenStyles.metricLabel}>Entrega</div>
              <strong>{successState.order.shippingPostalCode ?? '-'}</strong>
              <div style={successScreenStyles.metricMeta}>Zona {successState.order.shippingZoneId ?? '-'}</div>
            </div>
          </Card>

          <div
            style={successScreenStyles.contentGrid}
          >
            <div style={successScreenStyles.columnStack}>
              <SectionCard
                title="Siguiente paso"
                description="La siguiente acción depende del estado de pago actual."
              >
                <div style={successScreenStyles.sectionStack}>
                  <div style={successScreenStyles.mutedText}>
                    {successState.order.status === 'PENDING_PAYMENT'
                      ? 'Tu compra ya quedó registrada. El siguiente paso es completar el pago y después seguir el estado desde el detalle de la orden.'
                      : successState.order.status === 'PAID'
                        ? 'La orden ya figura como pagada. Desde el detalle vas a poder ver si la preparación o la entrega ya avanzaron.'
                        : 'La orden ya no admite pago. Podés revisar el detalle o consultar tus órdenes.'}
                  </div>
                  <div style={successScreenStyles.actionRow}>
                    <Link to={detailHref} style={successScreenStyles.actionLink}>
                      <Button variant="secondary">Seguir esta orden</Button>
                    </Link>
                    <Link to={routes.storeOrders} style={successScreenStyles.actionLink}>
                      <Button variant="ghost">Ver órdenes</Button>
                    </Link>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Items confirmados"
                description="Detalle de los productos que quedaron registrados en la orden."
              >
                <div style={successScreenStyles.sectionStack}>
                  {successState.submittedItems.map((item) => (
                    <div
                      key={item.productId}
                      style={successScreenStyles.itemRow}
                    >
                      <span style={successScreenStyles.itemName}>{item.qty} x {item.name}</span>
                      <strong style={successScreenStyles.itemTotal}>{formatMoneyFromCents(item.priceCents * item.qty, successState.order.currency)}</strong>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Pago"
                description="Podés retomar el handoff al proveedor si la orden sigue pendiente."
              >
                <StorePaymentInitiateAction
                  orderId={successState.order.orderId}
                  orderStatus={successState.order.status}
                  totalAmount={successState.order.totalAmount}
                  currency={successState.order.currency}
                />
              </SectionCard>
            </div>

            <div style={successScreenStyles.columnStack}>
              <EcosystemSurfaceSection tone="warm">
                <OrderSummary
                  title="Resumen de compra"
                  rows={[
                    { label: 'Subtotal', value: formatMoney(successState.order.subtotalAmount, successState.order.currency) },
                    { label: 'Envío', value: formatMoney(successState.order.shippingCostAmount, successState.order.shippingCurrency) },
                    ...(successState.order.discountAmount > 0
                      ? [{
                          label: successState.order.appliedCouponCode
                            ? `Descuento (${successState.order.appliedCouponCode})`
                            : 'Descuento',
                          value: `-${formatMoney(successState.order.discountAmount, successState.order.currency)}`
                        }]
                      : []),
                    { label: 'Total', value: formatMoney(successState.order.totalAmount, successState.order.currency) }
                  ]}
                />
              </EcosystemSurfaceSection>

              <SectionCard
                title="Resumen económico"
                description="El total ya quedó consolidado con envío y descuentos aplicados."
              >
                <div style={successScreenStyles.economyStack}>
                  <div style={successScreenStyles.economyRow}>
                    <span style={successScreenStyles.mutedText}>Total de la compra</span>
                    <strong style={successScreenStyles.economyTotal}>{formatMoney(successState.order.totalAmount, successState.order.currency)}</strong>
                  </div>
                  {successState.order.discountAmount > 0 ? (
                    <div style={successScreenStyles.economyRow}>
                      <span style={successScreenStyles.mutedText}>Descuento aplicado</span>
                      <strong>
                        {successState.order.appliedCouponCode
                          ? `${successState.order.appliedCouponCode} · `
                          : ''}
                        -{formatMoney(successState.order.discountAmount, successState.order.currency)}
                      </strong>
                    </div>
                  ) : null}
                  <div style={successScreenStyles.economyRow}>
                    <span style={successScreenStyles.mutedText}>Código postal</span>
                    <strong>{successState.order.shippingPostalCode ?? '-'}</strong>
                  </div>
                  <div style={successScreenStyles.economyRow}>
                    <span style={successScreenStyles.mutedText}>Zona</span>
                    <strong>{successState.order.shippingZoneId ?? '-'}</strong>
                  </div>
                  <div style={successScreenStyles.mutedText}>
                    Guardamos tu orden con el total final ya calculado. Si el pago todavía está pendiente, podés completarlo desde esta pantalla o seguir todo desde el detalle.
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </PublicStoreLayout>
  )
}
