import { Button, EmptyState, StatusBadge, Table } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatDate } from '../../../../ui/utils/format'
import type { StoreFulfillmentRecord } from '../types'

type StoreFulfillmentTableProps = {
  rows: StoreFulfillmentRecord[]
  onOpenDetail: (fulfillmentId: string) => void
}

export function StoreFulfillmentTable({ rows, onOpenDetail }: StoreFulfillmentTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin fulfillments"
        description="Todavía no hay fulfillments para la store actual."
      />
    )
  }

  return (
    <Table
      headers={['fulfillmentId', 'storeOrderId', 'method', 'status', 'createdAt']}
      rows={rows.map((row) => ([
        <Button
          key={`${row.fulfillmentId}-open`}
          variant="ghost"
          onClick={() => onOpenDetail(row.fulfillmentId)}
          style={{ padding: 0, justifyContent: 'flex-start' }}
        >
          {row.fulfillmentId}
        </Button>,
        row.storeOrderId,
        row.method,
        <StatusBadge key={`${row.fulfillmentId}-status`} status={row.status} />,
        <span key={`${row.fulfillmentId}-created`} style={{ color: theme.colors.textMuted }}>
          {formatDate(row.createdAt)}
        </span>
      ]))}
    />
  )
}
