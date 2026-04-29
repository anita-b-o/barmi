import { Link } from 'react-router-dom'
import { Pagination } from '@/components/navigation'
import StatusBadge from '@/components/commerce/StatusBadge'
import Table from '@/components/primitives/Table'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { EcosystemOrdersListResult } from '../types'

type EcosystemOrdersTableProps = {
  data: EcosystemOrdersListResult
  onPageChange: (page: number) => void
  getDetailPath?: (orderId: string) => string
}

export function EcosystemOrdersTable({
  data,
  onPageChange,
  getDetailPath = routes.ecosystemOrderDetailPath
}: EcosystemOrdersTableProps) {
  const rows = data.content.map((order) => [
    order.orderId,
    <StatusBadge key={`${order.orderId}-status`} status={order.status} />,
    formatMoney(order.totalAmount, order.currency),
    formatDate(order.createdAt),
    <Link
      key={`${order.orderId}-detail`}
      to={getDetailPath(order.orderId)}
      style={{ color: theme.colors.primary, textDecoration: 'none' }}
    >
      {order.status === 'PENDING_PAYMENT' ? 'Seguir pago' : 'Ver detalle'}
    </Link>
  ])

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <Table
        headers={['Order ID', 'Estado', 'Total', 'Creada', 'Acción']}
        rows={rows}
        emptyMessage="No hay órdenes ecosystem para mostrar"
      />
      <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
    </div>
  )
}
