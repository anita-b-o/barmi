import type { CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { OrderSummary, StatusBadge } from '@/components/commerce'
import { SectionCard } from '@/components/navigation'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import EmptyState from '@/components/feedback/EmptyState'
import { formatDate, formatMoney } from '@/core/utils/format'
import { Breadcrumbs } from '@/components/navigation'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemPaymentInitiateAction, EcosystemSurfaceSection, type EcosystemCheckoutSuccessState } from '@/features/ecosystem'

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
  contentGrid: {
    display: 'grid',
    gap: theme.spacing.xl,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    alignItems: 'start'
  },
  columnStack: { display: 'grid', gap: theme.spacing.xl, minWidth: 0 },
  sectionStack: { display: 'grid', gap: theme.spacing.md },
  actionRow: { display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' },
  footerActions: { display: 'flex', gap: 12, flexWrap: 'wrap' },
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

export default function EcosystemCheckoutSuccessScreen() {
  const location = useLocation()
  const successState = location.state as EcosystemCheckoutSuccessState | null

  return (
    <EcosystemLayout>
      <Breadcrumbs items={[{ label: 'Ecosystem', href: routes.ecosystemHome }, { label: 'Checkout' }, { label: 'Confirmación' }]} />

      {!successState ? (
        <EcosystemSurfaceSection>
          <EmptyState
            title="No hay una orden reciente para mostrar"
            description="Volvé al checkout del ecosystem o revisá el listado de órdenes."
          />
        </EcosystemSurfaceSection>
      ) : (
        <div style={successScreenStyles.pageStack}>
          <EcosystemHeroSection
            eyebrow="Orden creada"
            title="Tu compra en el ecosystem ya quedó creada"
            description={successState.order.status === 'PENDING_PAYMENT'
              ? 'Guardamos la orden con su total consolidado y podés continuar al detalle para seguir el estado o completar el pago.'
              : 'La orden externa ya quedó registrada y podés seguirla desde el detalle.'}
            badges={(
              <>
                <EcosystemHeroBadge variant="success">Orden registrada</EcosystemHeroBadge>
                {successState.order.discountAmount > 0 ? <EcosystemHeroBadge variant="info">Descuento aplicado</EcosystemHeroBadge> : null}
                <EcosystemHeroBadge>{successState.ecosystem.name}</EcosystemHeroBadge>
              </>
            )}
            actions={(
              <>
                <Link to={routes.ecosystemOrderDetailPath(successState.order.id)} style={successScreenStyles.actionLink}>
                  <Button>Ver orden</Button>
                </Link>
                <Link to={routes.ecosystemOrders} style={successScreenStyles.actionLink}>
                  <Button variant="secondary">Ver órdenes</Button>
                </Link>
              </>
            )}
            aside={(
              <>
                <div style={successScreenStyles.mutedText}>Total final</div>
                <div style={successScreenStyles.heroTotal}>
                  {formatMoney(successState.order.totalAmount, successState.order.currency)}
                </div>
                <div style={successScreenStyles.orderId}>
                  Orden {successState.order.id}
                </div>
              </>
            )}
          />

          <Card
            variant="soft"
            style={successScreenStyles.metricsCard}
          >
            <div style={successScreenStyles.metricTile}>
              <div style={successScreenStyles.metricLabel}>Ecosystem</div>
              <strong>{successState.ecosystem.name}</strong>
            </div>
            <div style={successScreenStyles.metricTile}>
              <div style={successScreenStyles.metricLabel}>Estado</div>
              <StatusBadge status={successState.order.status} />
            </div>
            <div style={successScreenStyles.metricTile}>
              <div style={successScreenStyles.metricLabel}>Creada</div>
              <strong>{formatDate(successState.order.createdAt)}</strong>
            </div>
          </Card>

          <div
            style={successScreenStyles.contentGrid}
          >
            <div style={successScreenStyles.columnStack}>
              <SectionCard title="Siguiente paso" description="La próxima acción depende del estado de pago actual.">
                <div style={successScreenStyles.sectionStack}>
                  <div style={successScreenStyles.mutedText}>
                    {successState.order.status === 'PENDING_PAYMENT'
                      ? 'La orden ya quedó registrada. El siguiente paso es completar el pago o seguir el detalle para monitorear su estado.'
                      : successState.order.status === 'PAID'
                        ? 'La orden ya figura pagada. Podés seguir el detalle o volver al listado de órdenes.'
                        : successState.order.status === 'CANCELLED'
                          ? 'La orden fue cancelada. Revisá el detalle o el listado para más contexto.'
                          : 'Revisá el detalle de la orden o el listado para continuar el seguimiento.'}
                  </div>
                  <div style={successScreenStyles.actionRow}>
                    <Link to={routes.ecosystemOrderDetailPath(successState.order.id)} style={successScreenStyles.actionLink}>
                      <Button>Seguir esta orden</Button>
                    </Link>
                    <Link to={routes.ecosystemOrders} style={successScreenStyles.actionLink}>
                      <Button variant="secondary">Ver órdenes</Button>
                    </Link>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Items confirmados" description="Detalle de los productos externos registrados en la orden.">
                <div style={successScreenStyles.sectionStack}>
                  {successState.submittedItems.map((item) => (
                    <div
                      key={item.externalProductId}
                      style={successScreenStyles.itemRow}
                    >
                      <span style={successScreenStyles.itemName}>{item.qty} x {item.name}</span>
                      <strong style={successScreenStyles.itemTotal}>{formatMoney(item.unitPriceAmount * item.qty, successState.order.currency)}</strong>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Pago" description="Podés retomar el checkout externo si la orden sigue pendiente.">
                <EcosystemPaymentInitiateAction
                  orderId={successState.order.id}
                  orderStatus={successState.order.status}
                  ecosystemId={successState.order.ecosystemId}
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
                    { label: 'Envío', value: formatMoney(successState.order.shippingCostAmount, successState.order.currency) },
                    ...(successState.order.discountAmount > 0 ? [{
                      label: successState.order.appliedCouponCode ? `Descuento (${successState.order.appliedCouponCode})` : 'Descuento',
                      value: `-${formatMoney(successState.order.discountAmount, successState.order.currency)}`
                    }] : []),
                    { label: 'Total', value: formatMoney(successState.order.totalAmount, successState.order.currency) }
                  ]}
                />
              </EcosystemSurfaceSection>

              <SectionCard title="Resumen económico" description="El total final ya quedó consolidado con envío y descuento, si aplicó.">
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
                    <strong>{successState.quote?.postalCode ?? 'Sin envío'}</strong>
                  </div>
                  <div style={successScreenStyles.economyRow}>
                    <span style={successScreenStyles.mutedText}>Zona</span>
                    <strong>{successState.quote?.zoneId ?? 'Sin envío'}</strong>
                  </div>
                  <div style={successScreenStyles.mutedText}>
                    Si el pago sigue pendiente, podés retomarlo desde esta pantalla o seguir todo desde el detalle público de la orden.
                  </div>
                </div>
              </SectionCard>

              <div style={successScreenStyles.footerActions}>
                <Link to={routes.ecosystemOrderDetailPath(successState.order.id)} style={successScreenStyles.actionLink}>
                  <Button>Ver orden</Button>
                </Link>
                <Link to={routes.ecosystemCatalog} style={successScreenStyles.actionLink}>
                  <Button variant="secondary">Volver al catálogo</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </EcosystemLayout>
  )
}
