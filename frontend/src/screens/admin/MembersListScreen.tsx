import { useState } from 'react'
import { AdminLayout } from '../../layouts'
import { PageHeader, SectionCard } from '../../design-system/patterns'
import { Button, ErrorAlert, LoadingBlock } from '../../design-system/components'
import { useAuth } from '../../core/auth'
import { theme } from '../../app/theme'
import {
  CreateMemberModal,
  StoreMembersTable,
  UpdateMemberRoleModal,
  useStoreMembers,
  type StoreMemberRole,
  type StoreMemberRow
} from '../../modules/members'

export default function MembersListScreen() {
  const { me } = useAuth()
  const members = useStoreMembers()
  const [createOpen, setCreateOpen] = useState(false)
  const [roleModalMember, setRoleModalMember] = useState<StoreMemberRow | null>(null)

  const availableCreateRoles = (['OWNER', 'ADMIN', 'STAFF'] as StoreMemberRole[]).filter((role) =>
    members.supportsRoleOption(role)
  )

  const availableRolesForMember = (member: StoreMemberRow) =>
    (['OWNER', 'ADMIN', 'STAFF'] as StoreMemberRole[]).filter((role) => {
      if (!members.supportsRoleOption(role)) return false
      return role === member.role || members.canAssignRole(member.role, member.status, role)
    })

  const handleCreateMember = async (payload: { memberEmail: string; role: StoreMemberRole }) => {
    await members.createMember(payload)
    setCreateOpen(false)
  }

  const handleUpdateRole = async (payload: { memberId: string; role: StoreMemberRole }) => {
    await members.updateRole(payload)
    setRoleModalMember(null)
  }

  const handleToggleStatus = async (member: StoreMemberRow) => {
    await members.updateStatus({
      memberId: member.memberId,
      status: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    })
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Store Members"
        subtitle={me?.email}
        actions={(
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={members.actor.role !== 'OWNER' && members.actor.role !== 'ADMIN'}
          >
            Invitar miembro
          </Button>
        )}
      />

      {members.error && (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={members.error} />
        </div>
      )}

      {members.loading ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <LoadingBlock label="Cargando miembros de la store..." />
        </div>
      ) : (
        <div style={{ marginTop: theme.spacing.xl }}>
          <SectionCard title="Miembros de la store actual">
            {members.updateStatusError ? (
              <div style={{ marginBottom: theme.spacing.lg }}>
                <ErrorAlert message={members.updateStatusError} />
              </div>
            ) : null}
            <StoreMembersTable
              rows={members.rows}
              onChangeRole={(member) => setRoleModalMember(member)}
              onChangeStatus={(member) => {
                void handleToggleStatus(member)
              }}
              canChangeRole={(member) => availableRolesForMember(member).length > 1}
              canChangeStatus={(member) => {
                const nextStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                return members.canToggleStatus(member.role, member.status, nextStatus)
              }}
              isUpdatingRole={members.isUpdatingRole}
              isUpdatingStatus={members.isUpdatingStatus}
            />
          </SectionCard>
        </div>
      )}

      <CreateMemberModal
        open={createOpen}
        availableRoles={availableCreateRoles}
        error={members.createError}
        loading={members.isCreating}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateMember}
      />

      <UpdateMemberRoleModal
        open={!!roleModalMember}
        member={roleModalMember}
        availableRoles={roleModalMember ? availableRolesForMember(roleModalMember) : []}
        error={members.updateRoleError}
        loading={members.isUpdatingRole}
        onClose={() => setRoleModalMember(null)}
        onSave={handleUpdateRole}
      />
    </AdminLayout>
  )
}
