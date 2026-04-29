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

export default function StoreCheckoutSuccessScreen() {
  const location = useLocation()
  const successState = location.state as StoreCheckoutSuccessState | null
  const detailHref = successState ? routes.storeOrderDetailPath(successState.order.orderId) : routes.storeOrders
  const hasDiscount = Boolean(successState && successState.order.discountAmount > 0)

  return (
    <PublicStoreLayout>
      <Breadcrumbs items={[{ label: 'Store', href: routes.publicStore('demo-store') }, { label: 'Checkout' }, { label: 'Confirmación' }]} />

      {!successState ? (
        <EcosystemSurfaceSection>
          <EmptyState
            title="No hay una orden reciente para mostrar"
            description="Volvé al checkout o revisá el listado de órdenes."
          />
        </EcosystemSurfaceSection>
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}>
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
                <Link to={detailHref} style={{ textDecoration: 'none' }}>
                  <Button>Ver detalle</Button>
                </Link>
                <Link to={routes.storeOrders} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">Ver órdenes</Button>
                </Link>
              </>
            )}
            aside={(
              <>
                <div style={{ color: theme.colors.textMuted }}>Total final</div>
                <div style={{ fontSize: theme.typography.display.size, fontWeight: theme.typography.display.weight, color: theme.colors.textPrimary, lineHeight: 1 }}>
                  {formatMoney(successState.order.totalAmount, successState.order.currency)}
                </div>
                <div style={{ color: theme.colors.textMuted, overflowWrap: 'anywhere' }}>
                  Orden {successState.order.orderId}
                </div>
              </>
            )}
          />

          <Card
            variant="soft"
            style={{
              display: 'grid',
              gap: theme.spacing.md,
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              background: theme.colors.bgSurfaceAlt
            }}
          >
            <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.bgSurfaceAlt, border: `1px solid ${theme.colors.borderDefault}` }}>
              <div style={{ color: theme.colors.textMuted, marginBottom: 4 }}>Estado</div>
              <StatusBadge status={successState.order.status} />
            </div>
            <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.bgSurfaceAlt, border: `1px solid ${theme.colors.borderDefault}` }}>
              <div style={{ color: theme.colors.textMuted, marginBottom: 4 }}>Creada</div>
              <strong>{formatDate(successState.order.createdAt)}</strong>
            </div>
            <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.bgSurfaceAlt, border: `1px solid ${theme.colors.borderDefault}` }}>
              <div style={{ color: theme.colors.textMuted, marginBottom: 4 }}>Entrega</div>
              <strong>{successState.order.shippingPostalCode ?? '-'}</strong>
              <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>Zona {successState.order.shippingZoneId ?? '-'}</div>
            </div>
          </Card>

          <div
            style={{
              display: 'grid',
              gap: theme.spacing.xl,
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              alignItems: 'start'
            }}
          >
            <div style={{ display: 'grid', gap: theme.spacing.xl, minWidth: 0 }}>
              <SectionCard
                title="Siguiente paso"
                description="La siguiente acción depende del estado de pago actual."
              >
                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  <div style={{ color: theme.colors.textMuted }}>
                    {successState.order.status === 'PENDING_PAYMENT'
                      ? 'Tu compra ya quedó registrada. El siguiente paso es completar el pago y después seguir el estado desde el detalle de la orden.'
                      : successState.order.status === 'PAID'
                        ? 'La orden ya figura como pagada. Desde el detalle vas a poder ver si la preparación o la entrega ya avanzaron.'
                        : 'La orden ya no admite pago. Podés revisar el detalle o consultar tus órdenes.'}
                  </div>
                  <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                    <Link to={detailHref} style={{ textDecoration: 'none' }}>
                      <Button variant="secondary">Seguir esta orden</Button>
                    </Link>
                    <Link to={routes.storeOrders} style={{ textDecoration: 'none' }}>
                      <Button variant="ghost">Ver órdenes</Button>
                    </Link>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Items confirmados"
                description="Detalle de los productos que quedaron registrados en la orden."
              >
                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  {successState.submittedItems.map((item) => (
                    <div
                      key={item.productId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: theme.spacing.lg,
                        paddingBottom: theme.spacing.md,
                        borderBottom: `1px solid ${theme.colors.borderDefault}`
                      }}
                    >
                      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{item.qty} x {item.name}</span>
                      <strong style={{ minWidth: 0, marginLeft: 'auto', textAlign: 'right' }}>{formatMoneyFromCents(item.priceCents * item.qty, successState.order.currency)}</strong>
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

            <div style={{ display: 'grid', gap: theme.spacing.xl, minWidth: 0 }}>
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
                <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                    <span style={{ color: theme.colors.textMuted }}>Total de la compra</span>
                    <strong style={{ fontSize: theme.typography.title.size }}>{formatMoney(successState.order.totalAmount, successState.order.currency)}</strong>
                  </div>
                  {successState.order.discountAmount > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                      <span style={{ color: theme.colors.textMuted }}>Descuento aplicado</span>
                      <strong>
                        {successState.order.appliedCouponCode
                          ? `${successState.order.appliedCouponCode} · `
                          : ''}
                        -{formatMoney(successState.order.discountAmount, successState.order.currency)}
                      </strong>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                    <span style={{ color: theme.colors.textMuted }}>Código postal</span>
                    <strong>{successState.order.shippingPostalCode ?? '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                    <span style={{ color: theme.colors.textMuted }}>Zona</span>
                    <strong>{successState.order.shippingZoneId ?? '-'}</strong>
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>
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
