import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { routes } from '../../core/constants/routes'
import { useStoreOrderDetail, StorePaymentInitiateAction } from '../../modules/orders'
import { formatDate, formatMoney } from '../utils/format'
import PlatformLayout from '../layout/PlatformLayout'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import Button from '../components/Button'
import ErrorAlert from '../components/ErrorAlert'
import LoadingBlock from '../components/LoadingBlock'
import DetailCard from '../components/DetailCard'
import KeyValueList from '../components/KeyValueList'
import StatusBadge from '../components/StatusBadge'
import { theme } from '../theme/theme'

function formatOrderStatus(status: string) {
  if (status === 'PENDING_PAYMENT') return 'PENDING'
  if (status === 'PAID') return 'PAID'
  if (status === 'CANCELLED') return 'CANCELLED'
  return status
}

function formatPaymentStatus(order: { status: string; payment: { status: string } | null }) {
  if (order.payment === null) {
    if (order.status === 'PAID') return 'APPROVED'
    if (order.status === 'CANCELLED') return 'REJECTED'
    return 'PENDING'
  }
  if (order.payment.status === 'CONFIRMED') return 'APPROVED'
  if (order.payment.status === 'FAILED') return 'REJECTED'
  if (order.payment.status === 'PENDING') return 'PENDING'
  return order.payment.status
}

export default function OrderDetailScreen() {
  const { orderId } = useParams()
  const order = useStoreOrderDetail(orderId)

  const statusLabels = useMemo(() => {
    if (!order.order) return null
    return {
      orderStatus: formatOrderStatus(order.order.status),
      paymentStatus: formatPaymentStatus(order.order)
    }
  }, [order.order])

  if (!orderId) return <div>Order ID requerido.</div>

  return (
    <PlatformLayout>
      <PageHeader
        title="Detalle de orden"
        subtitle={
          order.order?.status === 'PAID'
            ? 'La orden ya figura como pagada.'
            : order.order?.status === 'CANCELLED'
              ? 'La orden fue cancelada.'
              : order.order?.status === 'PENDING_PAYMENT'
                ? 'Seguimiento post-pago de una orden STORE pendiente.'
                : 'Seguimiento público de la orden STORE.'
        }
        actions={(
          <>
            <Button onClick={() => void order.refetch().catch(() => undefined)} disabled={order.isLoading || order.isFetching}>
              {order.isFetching ? 'Actualizando...' : 'Actualizar estado'}
            </Button>
            <Link to={routes.storeOrders} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver a órdenes</Link>
            <Link to={routes.publicStore('demo-store')} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver a tienda</Link>
          </>
        )}
      />

      {order.isLoading && <LoadingBlock label="Cargando..." />}
      {order.error && <div style={{ marginTop: theme.spacing.lg }}><ErrorAlert message={order.error} /></div>}

      {order.order && (
        <>
          <Section title="Seguimiento post-pago">
            <DetailCard>
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                  <span style={{ color: theme.colors.textMuted }}>Order Status</span>
                  <StatusBadge status={statusLabels?.orderStatus ?? order.order.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                  <span style={{ color: theme.colors.textMuted }}>Payment Status</span>
                  <StatusBadge status={statusLabels?.paymentStatus ?? 'PENDING'} />
                </div>
                <div style={{ color: theme.colors.textMuted }}>
                  {order.order.status === 'PENDING_PAYMENT'
                    ? 'La orden sigue pendiente. Podés reintentar el pago y usar esta pantalla como punto de seguimiento.'
                    : order.order.status === 'PAID'
                      ? 'El backend ya informó la orden como pagada.'
                      : order.order.status === 'CANCELLED'
                        ? 'La orden fue cancelada y ya no admite pago.'
                        : 'La orden ya no requiere nuevas acciones de pago.'}
                </div>
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
                  { label: 'Order ID', value: order.order.orderId },
                  { label: 'Fecha', value: formatDate(order.order.createdAt) },
                  { label: 'Order Status', value: <StatusBadge status={statusLabels?.orderStatus ?? order.order.status} /> },
                  { label: 'Payment Status', value: <StatusBadge status={statusLabels?.paymentStatus ?? 'PENDING'} /> },
                  { label: 'Total', value: formatMoney(order.order.totalAmount, order.order.currency) }
                ]}
              />
            </DetailCard>
          </Section>

          <Section title="Totales">
            <DetailCard>
              <KeyValueList
                items={[
                  { label: 'Subtotal', value: formatMoney(order.order.subtotalAmount, order.order.currency) },
                  { label: 'Envío', value: formatMoney(order.order.shippingCostAmount, order.order.currency) },
                  { label: 'Total', value: formatMoney(order.order.totalAmount, order.order.currency) }
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

          <Section title="Envío">
            <DetailCard>
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
                      { label: 'Provider Payment ID', value: order.order.payment.providerPaymentId },
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
      )}
    </PlatformLayout>
  )
}
