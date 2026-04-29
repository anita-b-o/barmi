import { OrderDetailCards, StatusBadge } from '@/components/commerce'
import ErrorState from '@/components/feedback/ErrorState'
import { formatDate, formatMoney } from '@/core/utils/format'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import { theme } from '@/app/theme'
import type { StoreAdminOrderDetailViewModel } from '../types'

type StoreOrderDetailCardsProps = {
  order: StoreAdminOrderDetailViewModel
}

export function StoreOrderDetailCards({ order }: StoreOrderDetailCardsProps) {
  const itemRows = order.items.map((item) => ([
    item.name ?? '-',
    String(item.qty),
    formatMoney(item.unitPriceAmount, item.currency),
    formatMoney(item.lineTotalAmount, item.currency)
  ]))

  return (
    <div style={{ display: 'grid', gap: theme.spacing.xl }}>
      <Card variant="soft">
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <strong>Resumen operativo</strong>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <StatusBadge status={order.operationalSummary.status} />
            <Badge variant={order.operationalSummary.paymentConfirmed ? 'success' : 'warning'}>
              Pago confirmado: {order.operationalSummary.paymentConfirmed ? 'Sí' : 'No'}
            </Badge>
            <Badge variant={order.operationalSummary.hasOperationalConflict ? 'danger' : 'neutral'}>
              Conflicto operativo: {order.operationalSummary.hasOperationalConflict ? 'Sí' : 'No'}
            </Badge>
            <Badge variant={order.operationalSummary.hasFulfillment ? 'success' : 'neutral'}>
              Fulfillment creado: {order.operationalSummary.hasFulfillment ? 'Sí' : 'No'}
            </Badge>
            <Badge variant={order.operationalSummary.manuallyCancelled ? 'danger' : 'neutral'}>
              Cancelada manualmente: {order.operationalSummary.manuallyCancelled ? 'Sí' : 'No'}
            </Badge>
          </div>
          <div style={{ color: theme.colors.textMuted }}>
            {order.operationalSummary.canRetryProcessing
              ? 'La orden admite reintento operativo porque el pago ya está confirmado y el conflicto de stock sigue abierto.'
              : order.operationalSummary.canCancel
                ? 'La orden todavía admite cancelación manual porque no tiene fulfillment creado.'
                : order.operationalSummary.hasFulfillment
                  ? 'La operación ya fue derivada a fulfillment y las acciones manuales sobre la orden quedan cerradas.'
                  : order.operationalSummary.manuallyCancelled
                    ? 'La orden ya fue cancelada manualmente y no admite nuevas acciones.'
                    : 'No hay acciones manuales disponibles con el estado operativo actual.'}
          </div>
        </div>
      </Card>

      {order.operationalIssue ? (
        <Card variant="soft">
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status="STOCK_CONFLICT" />
              <strong>{order.operationalIssue.title}</strong>
            </div>
            <ErrorState message={order.operationalIssue.message} />
            {order.operationalIssue.detectedAt ? (
              <div style={{ color: theme.colors.textMuted }}>
                Detectado: {formatDate(order.operationalIssue.detectedAt)}
              </div>
            ) : null}
            {order.payment ? (
              <div style={{ color: theme.colors.textMuted }}>
                El pago ya figura confirmado. Revisá stock y productos antes de decidir el siguiente paso operativo.
              </div>
            ) : null}
            {order.operationalIssue.items.length > 0 ? (
              <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                {order.operationalIssue.items.map((item, index) => (
                  <div key={`${item.productId ?? item.sku ?? index}`} style={{ color: theme.colors.textMuted }}>
                    {item.sku ?? item.productId ?? 'Producto'}: disponible {item.availableQuantity}, solicitado {item.requestedQuantity}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <OrderDetailCards
        sections={[
          {
            rows: [
              { label: 'Order ID', value: order.orderId },
              { label: 'Estado', value: <StatusBadge status={order.status} /> },
              { label: 'Moneda', value: order.currency },
              { label: 'Creada', value: formatDate(order.createdAt) }
            ]
          },
          {
            title: 'Totales',
            rows: [
              { label: 'Subtotal', value: formatMoney(order.subtotalAmount, order.currency) },
              { label: 'Envío', value: formatMoney(order.shippingCostAmount, order.currency) },
              { label: 'Total', value: formatMoney(order.totalAmount, order.currency) }
            ]
          },
          {
            title: 'Shipping',
            rows: [
              { label: 'shippingZoneId', value: order.shippingZoneId ?? '-' },
              { label: 'shippingPostalCode', value: order.shippingPostalCode ?? '-' },
              { label: 'shippingCostAmount', value: formatMoney(order.shippingCostAmount, order.currency) }
            ]
          },
          {
            table: {
              headers: ['Item', 'Qty', 'Unit Price', 'Line Total'],
              rows: itemRows,
              emptyMessage: 'La orden no tiene items.'
            }
          }
        ]}
      />

      <Card variant="soft">
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <strong>Timeline operativo</strong>
          {order.timeline.length === 0 ? (
            <div style={{ color: theme.colors.textMuted }}>
              No hay eventos operativos registrados para esta orden.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {order.timeline.map((event) => (
                <div key={`${event.code}-${event.occurredAt}`} style={{ display: 'grid', gap: theme.spacing.xs }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                    <strong>{event.title}</strong>
                    <span style={{ color: theme.colors.textMuted }}>{formatDate(event.occurredAt)}</span>
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>
                    {event.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
