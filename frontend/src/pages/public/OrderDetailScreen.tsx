import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { routes } from '@/core/constants/routes'
import { useStoreOrderDetail, StorePaymentInitiateAction } from '@/features/orders'
import { formatDate, formatMoney } from '@/core/utils/format'
import PublicStoreLayout from '@/layouts/PublicStoreLayout'
import { Breadcrumbs } from '@/components/navigation'
import Section from '@/components/ui/Section'
import Button from '@/components/primitives/Button'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import DetailCard from '@/components/ui/DetailCard'
import KeyValueList from '@/components/ui/KeyValueList'
import StatusBadge from '@/components/commerce/StatusBadge'
import { theme } from '@/app/theme'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemSurfaceSection } from '@/features/ecosystem'

function getOrderStage(order: {
  status: string
  payment: { status: string } | null
  fulfillment: { status: string } | null
  operationalIssue: unknown
}) {
  if (order.operationalIssue) {
    return {
      orderBadge: 'STOCK_CONFLICT',
      orderLabel: 'Conflicto operativo',
      paymentBadge: 'APPROVED',
      paymentLabel: 'Pago confirmado',
      fulfillmentBadge: 'PENDING',
      fulfillmentLabel: 'Pendiente de resolución',
      nextStep: 'El pago ya fue confirmado, pero la orden necesita revisión interna antes de preparar o despachar.',
      steps: [
        { label: 'Orden creada', done: true },
        { label: 'Pago confirmado', done: true },
        { label: 'Resolución operativa', done: false },
        { label: 'Entrega', done: false }
      ]
    }
  }

  if (order.status === 'CANCELLED') {
    return {
      orderBadge: 'CANCELLED',
      orderLabel: 'Orden cancelada',
      paymentBadge: order.payment ? 'APPROVED' : 'REJECTED',
      paymentLabel: order.payment ? 'Pago confirmado' : 'Pago no confirmado',
      fulfillmentBadge: 'CANCELLED',
      fulfillmentLabel: 'Sin entrega en curso',
      nextStep: 'La orden quedó cerrada y ya no admite nuevas acciones desde esta pantalla.',
      steps: [
        { label: 'Orden creada', done: true },
        { label: 'Pago', done: Boolean(order.payment) },
        { label: 'Cancelación', done: true },
        { label: 'Entrega', done: false }
      ]
    }
  }

  if (order.fulfillment) {
    const delivered = order.fulfillment.status === 'DELIVERED'
    const dispatched = order.fulfillment.status === 'DISPATCHED' || delivered
    return {
      orderBadge: 'PAID',
      orderLabel: 'Orden en preparación o entrega',
      paymentBadge: 'APPROVED',
      paymentLabel: 'Pago confirmado',
      fulfillmentBadge: order.fulfillment.status,
      fulfillmentLabel: delivered ? 'Entregado' : dispatched ? 'Despachado' : 'Preparando entrega',
      nextStep: delivered
        ? 'La entrega ya figura como completada.'
        : dispatched
          ? 'Tu pedido ya salió. Volvé a esta pantalla si querés revisar el último estado.'
          : 'Tu pedido ya está en preparación y el siguiente paso es el despacho.',
      steps: [
        { label: 'Orden creada', done: true },
        { label: 'Pago confirmado', done: true },
        { label: 'Preparación', done: true },
        { label: 'Entrega', done: delivered }
      ]
    }
  }

  if (order.status === 'PAID') {
    return {
      orderBadge: 'PAID',
      orderLabel: 'Orden pagada',
      paymentBadge: 'APPROVED',
      paymentLabel: 'Pago confirmado',
      fulfillmentBadge: 'PENDING',
      fulfillmentLabel: 'Preparación pendiente',
      nextStep: 'El pago ya fue confirmado. El siguiente paso es que el equipo prepare la orden.',
      steps: [
        { label: 'Orden creada', done: true },
        { label: 'Pago confirmado', done: true },
        { label: 'Preparación', done: false },
        { label: 'Entrega', done: false }
      ]
    }
  }

  return {
    orderBadge: 'PENDING',
    orderLabel: 'Esperando pago',
    paymentBadge: 'PENDING',
    paymentLabel: 'Pago pendiente',
    fulfillmentBadge: 'PENDING',
    fulfillmentLabel: 'Todavía no inició',
    nextStep: 'El siguiente paso es completar el pago. Después vas a poder seguir la preparación o la entrega desde esta misma pantalla.',
    steps: [
      { label: 'Orden creada', done: true },
      { label: 'Pago confirmado', done: false },
      { label: 'Preparación', done: false },
      { label: 'Entrega', done: false }
    ]
  }
}

export default function OrderDetailScreen() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const order = useStoreOrderDetail(orderId)
  const redirectStatus = (searchParams.get('status') ?? searchParams.get('collection_status') ?? '').toLowerCase()
  const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id')
  const paymentRedirectMessage = redirectStatus === 'approved'
    ? order.order?.status === 'PAID'
      ? 'El proveedor aprobó el pago y el backend ya lo confirmó.'
      : 'El proveedor informó el pago aprobado. Estamos esperando la confirmación del webhook; podés actualizar esta pantalla.'
    : redirectStatus === 'rejected' || redirectStatus === 'failure' || redirectStatus === 'cancelled' || redirectStatus === 'cancelled_by_user'
      ? 'El pago fue rechazado o cancelado por el proveedor. La orden sigue disponible para reintentar si continúa pendiente.'
      : redirectStatus === 'pending' || redirectStatus === 'in_process'
        ? 'El pago quedó pendiente en el proveedor. Esta pantalla va a seguir consultando el backend para confirmar si se acredita.'
        : redirectStatus
          ? 'Volviste desde el proveedor con un estado que no pudimos clasificar. Revisá el estado actual y actualizá si hace falta.'
          : null

  const tracking = useMemo(() => {
    if (!order.order) return null
    return getOrderStage(order.order)
  }, [order.order])

  if (!orderId) return <div>Order ID requerido.</div>

  return (
    <PublicStoreLayout>
      <Breadcrumbs
        items={[
          { label: 'Store', href: routes.publicStore('demo-store') },
          { label: 'Mis órdenes', href: routes.storeOrders },
          { label: orderId ?? 'Detalle' }
        ]}
      />
      <div style={{ display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}>
        <EcosystemHeroSection
          eyebrow="Detalle de orden"
          title="Detalle de orden"
          description={
            order.order?.status === 'PAID'
              ? 'Revisá si el pago ya fue confirmado y si la entrega ya empezó.'
              : order.order?.status === 'CANCELLED'
                ? 'La orden quedó cerrada. Acá todavía podés revisar su resumen final.'
                : order.order?.status === 'PENDING_PAYMENT'
                  ? 'Desde esta pantalla podés completar el pago o seguir cualquier novedad posterior.'
                  : 'Seguimiento público de la orden STORE.'
          }
          badges={order.order ? (
            <>
              <EcosystemHeroBadge>{order.order.orderId}</EcosystemHeroBadge>
              <EcosystemHeroBadge variant={order.order.status === 'PAID' ? 'success' : 'info'}>
                {order.order.status}
              </EcosystemHeroBadge>
            </>
          ) : undefined}
          actions={(
            <>
              <Button onClick={() => void order.refetch().catch(() => undefined)} disabled={order.isLoading || order.isFetching}>
                {order.isFetching ? 'Actualizando...' : 'Actualizar estado'}
              </Button>
              <Link to={routes.storeOrders} style={{ textDecoration: 'none' }}>
                <Button variant="secondary">Volver a órdenes</Button>
              </Link>
            </>
          )}
          aside={order.order ? (
            <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
              {tracking?.nextStep ?? 'Acá tenés estado, pago, entrega y resumen económico en un único lugar.'}
            </div>
          ) : undefined}
        />

        {order.isLoading ? <EcosystemSurfaceSection><LoadingState label="Cargando..." /></EcosystemSurfaceSection> : null}
        {order.error ? <EcosystemSurfaceSection><ErrorState message={order.error} /></EcosystemSurfaceSection> : null}

        {order.order ? (
          <>
          <Section title="Estado actual">
            <DetailCard>
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.surface }}>
                    <div style={{ color: theme.colors.textMuted, marginBottom: 6 }}>Pedido</div>
                    <StatusBadge status={tracking?.orderBadge ?? order.order.status} />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{tracking?.orderLabel}</div>
                  </div>
                  <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.surface }}>
                    <div style={{ color: theme.colors.textMuted, marginBottom: 6 }}>Pago</div>
                    <StatusBadge status={tracking?.paymentBadge ?? 'PENDING'} />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{tracking?.paymentLabel ?? 'Pago pendiente'}</div>
                  </div>
                  <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.surface }}>
                    <div style={{ color: theme.colors.textMuted, marginBottom: 6 }}>Entrega</div>
                    <StatusBadge status={tracking?.fulfillmentBadge ?? 'PENDING'} />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{tracking?.fulfillmentLabel ?? 'Sin datos'}</div>
                  </div>
                </div>
                <div style={{ color: theme.colors.textMuted }}>{tracking?.nextStep}</div>
                {paymentRedirectMessage ? (
                  <div style={{ color: redirectStatus === 'approved' || redirectStatus === 'pending' || redirectStatus === 'in_process' ? theme.colors.warning : theme.colors.error }}>
                    {paymentRedirectMessage}
                    {paymentId ? ` Referencia provider: ${paymentId}.` : ''}
                  </div>
                ) : null}
                {tracking ? (
                  <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                    {tracking.steps.map((step) => (
                      <div key={step.label} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                        <span>{step.label}</span>
                        <strong style={{ color: step.done ? theme.colors.success : theme.colors.textMuted }}>
                          {step.done ? 'Listo' : 'Pendiente'}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : null}
                {order.isAutoRefreshing ? (
                  <div style={{ color: theme.colors.textMuted }}>Actualización automática activa cada 5 segundos mientras la orden siga pendiente.</div>
                ) : null}
                {order.pollingExpired ? (
                  <div style={{ color: theme.colors.textMuted }}>La actualización automática se detuvo. Podés usar "Actualizar estado" para consultar el backend otra vez.</div>
                ) : null}
              </div>
            </DetailCard>
          </Section>

          <Section title="Resumen">
            <DetailCard>
              <KeyValueList
                items={[
                  { label: 'Orden', value: order.order.orderId },
                  { label: 'Fecha', value: formatDate(order.order.createdAt) },
                  { label: 'Estado del pedido', value: <StatusBadge status={tracking?.orderBadge ?? order.order.status} /> },
                  { label: 'Estado del pago', value: <StatusBadge status={tracking?.paymentBadge ?? 'PENDING'} /> },
                  { label: 'Entrega', value: <StatusBadge status={tracking?.fulfillmentBadge ?? 'PENDING'} /> },
                  { label: 'Total final', value: formatMoney(order.order.totalAmount, order.order.currency) }
                ]}
              />
            </DetailCard>
          </Section>

          <Section title="Totales">
            <DetailCard>
              <KeyValueList
                items={[
                  { label: 'Subtotal', value: formatMoney(order.order.subtotalAmount, order.order.currency) },
                  { label: 'Monto original', value: formatMoney(order.order.originalAmount, order.order.currency) },
                  ...(order.order.discountAmount > 0 ? [{
                    label: order.order.appliedCouponCode ? `Descuento (${order.order.appliedCouponCode})` : 'Descuento',
                    value: `-${formatMoney(order.order.discountAmount, order.order.currency)}`
                  }] : []),
                  { label: 'Envío', value: formatMoney(order.order.shippingCostAmount, order.order.currency) },
                  { label: 'Total final', value: formatMoney(order.order.totalAmount, order.order.currency) }
                ]}
              />
            </DetailCard>
          </Section>

          <Section title="Items">
            <DetailCard>
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                {order.order.items.map((item) => (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>{item.qty} x {item.name}</div>
                    <div>{formatMoney(item.lineTotalAmount, item.currency)}</div>
                  </div>
                ))}
              </div>
            </DetailCard>
          </Section>

          <Section title="Envío y entrega">
            <DetailCard>
              <div style={{ display: 'grid', gap: theme.spacing.lg }}>
                {order.order.shippingZoneId && order.order.shippingPostalCode ? (
                  <KeyValueList
                    items={[
                      { label: 'Zona', value: order.order.shippingZoneId },
                      { label: 'Código postal', value: order.order.shippingPostalCode }
                    ]}
                  />
                ) : (
                  <div style={{ color: theme.colors.textMuted }}>Sin snapshot de envío.</div>
                )}
                {order.order.fulfillment ? (
                  <KeyValueList
                    items={[
                      { label: 'Estado de entrega', value: <StatusBadge status={order.order.fulfillment.status} /> },
                      { label: 'Método', value: order.order.fulfillment.method },
                      { label: 'Inicio de preparación', value: formatDate(order.order.fulfillment.createdAt) }
                    ]}
                  />
                ) : (
                  <div style={{ color: theme.colors.textMuted }}>
                    {order.order.status === 'PAID'
                      ? 'Todavía no hay una entrega en curso informada.'
                      : 'La entrega va a aparecer acá cuando la orden avance.'}
                  </div>
                )}
              </div>
            </DetailCard>
          </Section>

          <Section title="Pago">
            <DetailCard>
              <div style={{ display: 'grid', gap: theme.spacing.lg }}>
                <StorePaymentInitiateAction
                  orderId={order.order.orderId}
                  orderStatus={order.order.status}
                  totalAmount={order.order.totalAmount}
                  currency={order.order.currency}
                />
                {order.order.payment ? (
                  <KeyValueList
                    items={[
                      { label: 'Provider', value: order.order.payment.provider },
                      { label: 'Confirmado', value: formatDate(order.order.payment.confirmedAt) }
                    ]}
                  />
                ) : (
                  <div style={{ color: theme.colors.textMuted }}>
                    {order.order.status === 'PENDING_PAYMENT'
                      ? 'Todavía no hay confirmación de pago informada por el backend.'
                      : 'Sin datos de pago disponibles.'}
                  </div>
                )}
              </div>
            </DetailCard>
          </Section>
          </>
        ) : null}
      </div>
    </PublicStoreLayout>
  )
}
