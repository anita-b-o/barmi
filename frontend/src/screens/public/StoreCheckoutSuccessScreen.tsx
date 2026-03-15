import { Link, useLocation } from 'react-router-dom'
import { PlatformLayout } from '../../layouts'
import { theme } from '../../app/theme'
import { PageHeader, OrderSummary, SectionCard } from '../../design-system/patterns'
import { Button, EmptyState, StatusBadge } from '../../design-system/components'
import { routes } from '../../core/constants/routes'
import { formatDate, formatMoney, formatMoneyFromCents } from '../../ui/utils/format'
import type { StoreCheckoutSuccessState } from '../../modules/checkout'
import { StorePaymentInitiateAction } from '../../modules/orders'

export default function StoreCheckoutSuccessScreen() {
  const location = useLocation()
  const successState = location.state as StoreCheckoutSuccessState | null
  const detailHref = successState ? routes.storeOrderDetailPath(successState.order.orderId) : routes.storeOrders

  return (
    <PlatformLayout>
      <PageHeader
        title="Orden creada"
        subtitle={successState?.order.status === 'PENDING_PAYMENT'
          ? 'La orden quedó creada y sigue pendiente de pago.'
          : 'El backend STORE confirmó la creación de la orden.'}
        actions={<Link to={routes.storeOrders} style={{ color: theme.colors.primary, textDecoration: 'none' }}>Ver órdenes</Link>}
      />

      {!successState ? (
        <EmptyState
          title="No hay una orden reciente para mostrar"
          description="Volvé al checkout o revisá el listado de órdenes."
        />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.xl }}>
          <SectionCard title="Estado de la orden">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Order ID</span>
                <strong>{successState.order.orderId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Estado</span>
                <StatusBadge status={successState.order.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Creada</span>
                <strong>{formatDate(successState.order.createdAt)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Siguiente paso">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ color: theme.colors.textMuted }}>
                {successState.order.status === 'PENDING_PAYMENT'
                  ? 'Podés ir al detalle para seguir el estado de la orden o reintentar el pago desde acá.'
                  : successState.order.status === 'PAID'
                    ? 'La orden ya figura como pagada. Podés revisar el detalle o consultar tus órdenes.'
                    : 'La orden ya no admite pago. Podés revisar el detalle o consultar tus órdenes.'}
              </div>
              <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                <Link to={detailHref} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">Ir al detalle</Button>
                </Link>
                <Link to={routes.storeOrders} style={{ textDecoration: 'none' }}>
                  <Button variant="ghost">Ver órdenes</Button>
                </Link>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Items confirmados">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {successState.submittedItems.map((item) => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                  <span>{item.qty} x {item.name}</span>
                  <strong>{formatMoneyFromCents(item.priceCents * item.qty, successState.order.currency)}</strong>
                </div>
              ))}
            </div>
          </SectionCard>

          <OrderSummary
            rows={[
              { label: 'Subtotal', value: formatMoney(successState.order.subtotalAmount, successState.order.currency) },
              { label: 'Envío', value: formatMoney(successState.order.shippingCostAmount, successState.order.shippingCurrency) },
              { label: 'Código postal', value: successState.order.shippingPostalCode },
              { label: 'Zona', value: successState.order.shippingZoneId },
              { label: 'Total', value: formatMoney(successState.order.totalAmount, successState.order.currency) }
            ]}
          />

          <SectionCard title="Pago">
            <StorePaymentInitiateAction
              orderId={successState.order.orderId}
              orderStatus={successState.order.status}
              totalAmount={successState.order.totalAmount}
              currency={successState.order.currency}
            />
          </SectionCard>
        </div>
      )}
    </PlatformLayout>
  )
}
