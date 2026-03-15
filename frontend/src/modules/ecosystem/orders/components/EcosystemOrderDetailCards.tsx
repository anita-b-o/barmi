import { OrderSummary, SectionCard } from '../../../../design-system/patterns'
import { StatusBadge } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatDate, formatMoney } from '../../../../ui/utils/format'
import type { EcosystemOrderDetailResult } from '../types'

type EcosystemOrderDetailCardsProps = {
  order: EcosystemOrderDetailResult
}

export function EcosystemOrderDetailCards({ order }: EcosystemOrderDetailCardsProps) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.xl }}>
      <SectionCard title="Datos de la orden">
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Order ID</span>
            <strong>{order.orderId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Estado</span>
            <StatusBadge status={order.status} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Creada</span>
            <strong>{formatDate(order.createdAt)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Moneda</span>
            <strong>{order.currency}</strong>
          </div>
        </div>
      </SectionCard>

      <OrderSummary
        rows={[
          { label: 'Subtotal', value: formatMoney(order.subtotalAmount, order.currency) },
          { label: 'Envío', value: formatMoney(order.shippingCostAmount, order.currency) },
          { label: 'Total', value: formatMoney(order.totalAmount, order.currency) }
        ]}
      />

      <SectionCard title="Items">
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
      </SectionCard>

      <SectionCard title="Shipping">
        {order.shipping ? (
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
        )}
      </SectionCard>

      <SectionCard title="Pago">
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
      </SectionCard>
    </div>
  )
}
