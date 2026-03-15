import { Link } from 'react-router-dom'
import { Pagination, StatusBadge, Table } from '../../../../design-system/components'
import { routes } from '../../../../core/constants/routes'
import { formatDate, formatMoney } from '../../../../ui/utils/format'
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
    <StatusBadge key={`${order.orderId}-status`} status={order.status} />,
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
        headers={['orderId', 'status', 'totalAmount', 'currency', 'createdAt', '']}
        rows={rows}
        emptyMessage="No hay órdenes para mostrar."
      />
      <Pagination page={page} totalPages={Math.max(totalPages, 1)} onChange={onPageChange} />
    </div>
  )
}
