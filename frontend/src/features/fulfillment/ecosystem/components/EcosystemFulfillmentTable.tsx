import Button from '@/components/primitives/Button'
import Table from '@/components/primitives/Table'
import EmptyState from '@/components/feedback/EmptyState'
import StatusBadge from '@/components/commerce/StatusBadge'
import { theme } from '@/app/theme'
import { formatDate } from '@/core/utils/format'
import type { EcosystemFulfillmentRecord } from '../types'

type EcosystemFulfillmentTableProps = {
  rows: EcosystemFulfillmentRecord[]
  onOpenDetail: (fulfillmentId: string) => void
}

export function EcosystemFulfillmentTable({ rows, onOpenDetail }: EcosystemFulfillmentTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin fulfillments"
        description="Todavía no hay fulfillments para el ecosystem actual."
      />
    )
  }

  return (
    <Table
      headers={['fulfillmentId', 'ecosystemOrderId', 'method', 'status', 'createdAt']}
      rows={rows.map((row) => ([
        <Button
          key={`${row.fulfillmentId}-open`}
          variant="ghost"
          onClick={() => onOpenDetail(row.fulfillmentId)}
          style={{ padding: 0, justifyContent: 'flex-start' }}
        >
          {row.fulfillmentId}
        </Button>,
        row.ecosystemOrderId,
        row.method,
        <StatusBadge key={`${row.fulfillmentId}-status`} status={row.status} />,
        <span key={`${row.fulfillmentId}-created`} style={{ color: theme.colors.textMuted }}>
          {formatDate(row.createdAt)}
        </span>
      ]))}
    />
  )
}
