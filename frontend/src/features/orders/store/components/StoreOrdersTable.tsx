import { Link } from 'react-router-dom'
import { Pagination } from '@/components/navigation'
import StatusBadge from '@/components/commerce/StatusBadge'
import Table from '@/components/primitives/Table'
import Badge from '@/components/primitives/Badge'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { StoreOrderListItem } from '../types'

type StoreOrdersTableProps = {
  orders: StoreOrderListItem[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function StoreOrdersTable({ orders, page, totalPages, onPageChange }: StoreOrdersTableProps) {
  const rows = orders.map((order) => ([
    order.orderId,
    <div key={`${order.orderId}-status`} style={{ display: 'grid', gap: 6 }}>
      <StatusBadge status={order.status} />
      {order.manuallyCancelled ? <Badge variant="danger">Cancelada manualmente</Badge> : null}
    </div>,
    <div key={`${order.orderId}-indicators`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {order.operationalIssue ? <StatusBadge status="STOCK_CONFLICT" /> : null}
      {order.paymentConfirmed ? <Badge variant="success">Pago confirmado</Badge> : <Badge variant="warning">Sin pago confirmado</Badge>}
      {order.hasFulfillment ? <Badge variant="success">Fulfillment creado</Badge> : <Badge variant="neutral">Sin fulfillment</Badge>}
    </div>,
    <div key={`${order.orderId}-actions`} style={{ display: 'grid', gap: 6 }}>
      <span style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
        {order.canRetryProcessing
          ? 'Se puede reintentar'
          : order.canCancel
            ? 'Se puede cancelar'
            : 'Sin acciones manuales'}
      </span>
      <span style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
        {order.operationalIssue
          ? 'Conflicto operativo derivado'
          : order.hasFulfillment
            ? 'Operación ya derivada a fulfillment'
            : order.paymentConfirmed
              ? 'Esperando siguiente paso operativo'
              : 'Pendiente de pago'}
      </span>
    </div>,
    formatMoney(order.totalAmount, order.currency),
    order.currency,
    formatDate(order.createdAt),
    <Link key={`${order.orderId}-detail`} to={routes.adminOrderDetail(order.orderId)}>
      Ver detalle
    </Link>
  ]))

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Table
        headers={['orderId', 'status', 'indicadores', 'operación', 'totalAmount', 'currency', 'createdAt', '']}
        rows={rows}
        emptyMessage="No hay órdenes para mostrar."
      />
      <Pagination page={page} totalPages={Math.max(totalPages, 1)} onChange={onPageChange} />
    </div>
  )
}
