import { Link, useLocation } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '../../app/theme'
import { routes } from '../../core/constants/routes'
import { PageHeader, OrderSummary, SectionCard } from '../../design-system/patterns'
import { Button, EmptyState, StatusBadge } from '../../design-system/components'
import { formatDate, formatMoney } from '../../ui/utils/format'
import { EcosystemPaymentInitiateAction, type EcosystemCheckoutSuccessState } from '../../modules/ecosystem'

export default function EcosystemCheckoutSuccessScreen() {
  const location = useLocation()
  const successState = location.state as EcosystemCheckoutSuccessState | null

  return (
    <EcosystemLayout>
      <PageHeader
        title="Orden ecosystem creada"
        subtitle={successState?.order.status === 'PENDING_PAYMENT'
          ? 'La orden quedó creada y sigue pendiente de pago.'
          : 'El backend confirmó la creación de la orden externa.'}
        actions={(
          <>
            {successState ? (
              <Link to={routes.ecosystemOrderDetailPath(successState.order.id)} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
                Ver orden
              </Link>
            ) : null}
            <Link to={routes.ecosystemOrders} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
              Ver órdenes
            </Link>
            <Link to={routes.ecosystemCatalog} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
              Volver al catálogo
            </Link>
          </>
        )}
      />

      {!successState ? (
        <EmptyState
          title="No hay una orden reciente para mostrar"
          description="Volvé al checkout del ecosystem o revisá el listado de órdenes."
        />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.xl }}>
          <SectionCard title="Siguiente paso">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ color: theme.colors.textMuted }}>
                {successState.order.status === 'PENDING_PAYMENT'
                  ? 'Podés continuar al detalle para seguir el estado real de la orden o iniciar el pago ahora.'
                  : successState.order.status === 'PAID'
                    ? 'La orden ya figura pagada. Podés revisar el detalle o volver al listado de órdenes.'
                    : successState.order.status === 'CANCELLED'
                      ? 'La orden fue cancelada. Revisá el detalle o el listado para más contexto.'
                      : 'Revisá el detalle de la orden o el listado para continuar el seguimiento.'}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to={routes.ecosystemOrderDetailPath(successState.order.id)} style={{ textDecoration: 'none' }}>
                  <Button>Ir al detalle</Button>
                </Link>
                <Link to={routes.ecosystemOrders} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">Ver órdenes</Button>
                </Link>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Estado de la orden">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Order ID</span>
                <strong>{successState.order.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Ecosystem</span>
                <strong>{successState.ecosystem.name}</strong>
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

          <SectionCard title="Items confirmados">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {successState.submittedItems.map((item) => (
                <div key={item.externalProductId} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                  <span>{item.qty} x {item.name}</span>
                  <strong>{formatMoney(item.unitPriceAmount * item.qty, successState.order.currency)}</strong>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Pago">
            <EcosystemPaymentInitiateAction
              orderId={successState.order.id}
              orderStatus={successState.order.status}
              ecosystemId={successState.order.ecosystemId}
              totalAmount={successState.order.totalAmount}
              currency={successState.order.currency}
            />
          </SectionCard>

          <OrderSummary
            rows={[
              { label: 'Subtotal', value: formatMoney(successState.order.subtotalAmount, successState.order.currency) },
              { label: 'Envío', value: formatMoney(successState.order.shippingCostAmount, successState.order.currency) },
              { label: 'Código postal', value: successState.quote?.postalCode ?? 'Sin envío' },
              { label: 'Zona', value: successState.quote?.zoneId ?? 'Sin envío' },
              { label: 'Total', value: formatMoney(successState.order.totalAmount, successState.order.currency) }
            ]}
          />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to={routes.ecosystemOrderDetailPath(successState.order.id)} style={{ textDecoration: 'none' }}>
              <Button>Ver orden</Button>
            </Link>
            <Link to={routes.ecosystemOrders} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Ver órdenes</Button>
            </Link>
            <Link to={routes.ecosystemCatalog} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Volver al catálogo</Button>
            </Link>
          </div>
        </div>
      )}
    </EcosystemLayout>
  )
}
