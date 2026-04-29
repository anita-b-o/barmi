import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/commerce'
import { formatDate } from '@/core/utils/format'
import { routes } from '@/core/constants/routes'
import { theme } from '@/app/theme'
import type { EcosystemFulfillmentRecord } from '../types'

type EcosystemFulfillmentDetailCardProps = {
  record: EcosystemFulfillmentRecord | null
  ecosystemId: string
}

export function EcosystemFulfillmentDetailCard({ record, ecosystemId }: EcosystemFulfillmentDetailCardProps) {
  if (!record) return null

  return (
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
        <span style={{ color: theme.colors.textMuted }}>Fulfillment ID</span>
        <strong>{record.fulfillmentId}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
        <span style={{ color: theme.colors.textMuted }}>Orden relacionada</span>
        <Link to={`${routes.adminEcosystemOrderDetail(record.ecosystemOrderId)}?ecosystemId=${encodeURIComponent(ecosystemId)}`} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
          {record.ecosystemOrderId}
        </Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
        <span style={{ color: theme.colors.textMuted }}>Método</span>
        <strong>{record.method}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
        <span style={{ color: theme.colors.textMuted }}>Estado</span>
        <StatusBadge status={record.status} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
        <span style={{ color: theme.colors.textMuted }}>Creado</span>
        <strong>{formatDate(record.createdAt)}</strong>
      </div>
    </div>
  )
}
