import { Card, StatusBadge, Table } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatDate, formatMoney } from '../../../../ui/utils/format'
import type { StoreOrderDetailViewModel } from '../types'

type StoreOrderDetailCardsProps = {
  order: StoreOrderDetailViewModel
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
      <Card>
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
            <span style={{ color: theme.colors.textMuted }}>Moneda</span>
            <strong>{order.currency}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Creada</span>
            <strong>{formatDate(order.createdAt)}</strong>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: theme.typography.title.size, fontWeight: 600, marginBottom: theme.spacing.lg }}>Totales</div>
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Subtotal</span>
            <strong>{formatMoney(order.subtotalAmount, order.currency)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Envío</span>
            <strong>{formatMoney(order.shippingCostAmount, order.currency)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Total</span>
            <strong>{formatMoney(order.totalAmount, order.currency)}</strong>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: theme.typography.title.size, fontWeight: 600, marginBottom: theme.spacing.lg }}>Shipping</div>
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>shippingZoneId</span>
            <strong>{order.shippingZoneId ?? '-'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>shippingPostalCode</span>
            <strong>{order.shippingPostalCode ?? '-'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>shippingCostAmount</span>
            <strong>{formatMoney(order.shippingCostAmount, order.currency)}</strong>
          </div>
        </div>
      </Card>

      <Table
        headers={['Item', 'Qty', 'Unit Price', 'Line Total']}
        rows={itemRows}
        emptyMessage="La orden no tiene items."
      />
    </div>
  )
}
