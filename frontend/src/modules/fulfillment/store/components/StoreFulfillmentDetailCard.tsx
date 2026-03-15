import { Link } from 'react-router-dom'
import { routes } from '../../../../core/constants/routes'
import { Card, StatusBadge } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatDate } from '../../../../ui/utils/format'
import type { StoreFulfillmentRecord } from '../types'

type StoreFulfillmentDetailCardProps = {
  record: StoreFulfillmentRecord | null
}

export function StoreFulfillmentDetailCard({
  record
}: StoreFulfillmentDetailCardProps) {
  return (
    <Card>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>fulfillmentId</span>
          <strong>{record?.fulfillmentId ?? '-'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>storeOrderId</span>
          {record?.storeOrderId ? (
            <Link to={routes.adminOrderDetail(record.storeOrderId)} style={{ color: theme.colors.primary, textDecoration: 'none', fontWeight: 600 }}>
              {record.storeOrderId}
            </Link>
          ) : (
            <strong>-</strong>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>method</span>
          <strong>{record?.method ?? '-'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>status</span>
          {record ? <StatusBadge status={record.status} /> : <strong>-</strong>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <span style={{ color: theme.colors.textMuted }}>createdAt</span>
          <strong>{record ? formatDate(record.createdAt) : '-'}</strong>
        </div>
      </div>
    </Card>
  )
}
