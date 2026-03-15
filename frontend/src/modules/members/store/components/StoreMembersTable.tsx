import { Badge, Button, EmptyState, StatusBadge, Table } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { UpdateMemberStatusAction } from './UpdateMemberStatusAction'
import type { StoreMemberRow } from '../types'

type StoreMembersTableProps = {
  rows: StoreMemberRow[]
  onChangeRole: (member: StoreMemberRow) => void
  onChangeStatus: (member: StoreMemberRow) => void
  canChangeRole: (member: StoreMemberRow) => boolean
  canChangeStatus: (member: StoreMemberRow) => boolean
  isUpdatingRole: boolean
  isUpdatingStatus: boolean
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function StoreMembersTable({
  rows,
  onChangeRole,
  onChangeStatus,
  canChangeRole,
  canChangeStatus,
  isUpdatingRole,
  isUpdatingStatus
}: StoreMembersTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin miembros cargados"
        description="Todavía no hay memberships para la store actual."
      />
    )
  }

  return (
    <Table
      headers={['memberEmail', 'role', 'status', 'createdAt', 'actions']}
      rows={rows.map((row) => ([
        row.memberEmail,
        <Badge key={`${row.memberId}-role`}>{row.role}</Badge>,
        <StatusBadge key={`${row.memberId}-status`} status={row.status} />,
        formatCreatedAt(row.createdAt),
        <div key={`${row.memberId}-actions`} style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Button
            onClick={() => onChangeRole(row)}
            disabled={!canChangeRole(row) || isUpdatingRole}
            variant="ghost"
          >
            Cambiar rol
          </Button>,
          <UpdateMemberStatusAction
            key={`${row.memberId}-status-action`}
            currentStatus={row.status}
            disabled={!canChangeStatus(row)}
            loading={isUpdatingStatus}
            onToggle={() => onChangeStatus(row)}
          />
        </div>
      ]))}
    />
  )
}
