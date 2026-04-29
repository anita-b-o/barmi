import { OrderDetailCards, StatusBadge } from '@/components/commerce'
import { theme } from '@/app/theme'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { EcosystemOrderDetailResult } from '../types'

type EcosystemOrderDetailCardsProps = {
  order: EcosystemOrderDetailResult
}

export function EcosystemOrderDetailCards({ order }: EcosystemOrderDetailCardsProps) {
  return (
    <OrderDetailCards
      sections={[
        {
          title: 'Datos de la orden',
          rows: [
            { label: 'Order ID', value: order.orderId },
            { label: 'Estado', value: <StatusBadge status={order.status} /> },
            { label: 'Creada', value: formatDate(order.createdAt) },
            { label: 'Moneda', value: order.currency }
          ]
        },
        {
          title: 'Resumen',
          rows: [
            { label: 'Subtotal', value: formatMoney(order.subtotalAmount, order.currency) },
            { label: 'Envío', value: formatMoney(order.shippingCostAmount, order.currency) },
            { label: 'Total', value: formatMoney(order.totalAmount, order.currency) }
          ]
        },
        {
          title: 'Items',
          content: (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {order.items.map((item) => (
                <div
                  key={`${item.productId}-${item.name}`}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name ?? item.productId}</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>
                      {item.qty} x {formatMoney(item.unitPriceAmount, item.currency)}
                    </div>
                  </div>
                  <strong>{formatMoney(item.lineTotalAmount, item.currency)}</strong>
                </div>
              ))}
            </div>
          )
        },
        {
          title: 'Shipping',
          content: order.shipping ? (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Zona</span>
                <strong>{order.shipping.zoneId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Código postal</span>
                <strong>{order.shipping.postalCode}</strong>
              </div>
            </div>
          ) : (
            <div style={{ color: theme.colors.textMuted }}>Sin shipping asociado.</div>
          )
        },
        {
          title: 'Pago',
          content: (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Estado de la orden</span>
                <StatusBadge status={order.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Estado de pago</span>
                {order.payment ? <StatusBadge status={order.payment.status} /> : <strong>{order.status === 'PENDING_PAYMENT' ? 'Pendiente' : 'Sin datos disponibles'}</strong>}
              </div>

              {order.payment ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                    <span style={{ color: theme.colors.textMuted }}>Proveedor</span>
                    <strong>{order.payment.provider}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                    <span style={{ color: theme.colors.textMuted }}>Provider payment ID</span>
                    <strong>{order.payment.providerPaymentId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                    <span style={{ color: theme.colors.textMuted }}>Confirmado</span>
                    <strong>{formatDate(order.payment.confirmedAt)}</strong>
                  </div>
                </>
              ) : (
                <div style={{ color: theme.colors.textMuted }}>
                  {order.status === 'PENDING_PAYMENT'
                    ? 'El pago todavía no fue confirmado. Si ya pagaste, esta pantalla puede tardar unos segundos en reflejarlo.'
                    : 'Todavía no hay información de pago asociada a esta orden.'}
                </div>
              )}
            </div>
          )
        }
      ]}
    />
  )
}
