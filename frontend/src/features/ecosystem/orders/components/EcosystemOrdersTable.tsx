import { Link } from 'react-router-dom'
import { Pagination } from '@/components/navigation'
import StatusBadge from '@/components/commerce/StatusBadge'
import { SurfaceCard } from '@/features/ecosystem/components/SurfaceCard'
import Table from '@/components/primitives/Table'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { useViewportMode } from '@/core/hooks/useViewportMode'
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
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const rows = data.content.map((order) => [
    order.orderId,
    <StatusBadge key={`${order.orderId}-status`} status={order.status} />,
    formatMoney(order.totalAmount, order.currency),
    formatDate(order.createdAt),
    <Link
      key={`${order.orderId}-detail`}
      to={getDetailPath(order.orderId)}
      style={{ color: theme.colors.actionPrimary, textDecoration: 'none' }}
    >
      {order.status === 'PENDING_PAYMENT' ? 'Seguir pago' : 'Ver detalle'}
    </Link>
  ])

  return (
    <div className="ecosystem-orders-table">
      <div className="ecosystem-orders-table__desktop">
        <Table
          headers={['Order ID', 'Estado', 'Total', 'Creada', 'Acción']}
          rows={rows}
          emptyMessage="No hay órdenes ecosystem para mostrar"
        />
      </div>

      {isMobile ? (
        <div className="ecosystem-orders-table__mobile" aria-label="Órdenes del ecosystem">
          <div className="ecosystem-orders-table__mobile-list">
            {data.content.map((order) => (
              <SurfaceCard key={order.orderId} variant="panel" className="ecosystem-orders-table__mobile-item">
                <div className="ecosystem-orders-table__mobile-row">
                  <span className="ecosystem-orders-table__mobile-label">Order ID</span>
                  <span className="ecosystem-orders-table__mobile-value">{order.orderId}</span>
                </div>
                <div className="ecosystem-orders-table__mobile-row">
                  <span className="ecosystem-orders-table__mobile-label">Estado</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="ecosystem-orders-table__mobile-row">
                  <span className="ecosystem-orders-table__mobile-label">Total</span>
                  <span className="ecosystem-orders-table__mobile-value">{formatMoney(order.totalAmount, order.currency)}</span>
                </div>
                <div className="ecosystem-orders-table__mobile-row">
                  <span className="ecosystem-orders-table__mobile-label">Creada</span>
                  <span className="ecosystem-orders-table__mobile-value">{formatDate(order.createdAt)}</span>
                </div>
                <div className="ecosystem-orders-table__mobile-row">
                  <span className="ecosystem-orders-table__mobile-label">Acción</span>
                  <Link
                    to={getDetailPath(order.orderId)}
                    style={{ color: theme.colors.actionPrimary, textDecoration: 'none', fontWeight: 600 }}
                  >
                    {order.status === 'PENDING_PAYMENT' ? 'Seguir pago' : 'Ver detalle'}
                  </Link>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </div>
      ) : null}

      <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
    </div>
  )
}
