import { useState } from 'react'
import { AdminLayout } from '../../layouts'
import { SectionCard } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Button from '@/components/primitives/Button'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import ToastContainer from '@/components/feedback/ToastContainer'
import { useAuth } from '@/core/auth'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import {
  CreateMemberModal,
  StoreMembersTable,
  UpdateMemberRoleModal,
  useStoreMembers,
  type StoreMemberRole,
  type StoreMemberRow
} from '@/features/members'

export default function MembersListScreen() {
  const { me } = useAuth()
  const members = useStoreMembers()
  const [createOpen, setCreateOpen] = useState(false)
  const [roleModalMember, setRoleModalMember] = useState<StoreMemberRow | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; variant?: 'success' | 'error' | 'info' }>>([])

  const addToast = (message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, variant }])
  }

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

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
    addToast('Miembro invitado', 'success')
    setCreateOpen(false)
  }

  const handleUpdateRole = async (payload: { memberId: string; role: StoreMemberRole }) => {
    await members.updateRole(payload)
    addToast('Rol actualizado', 'success')
    setRoleModalMember(null)
  }

  const handleToggleStatus = async (member: StoreMemberRow) => {
    await members.updateStatus({
      memberId: member.memberId,
      status: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    })
    addToast(member.status === 'ACTIVE' ? 'Miembro desactivado' : 'Miembro reactivado', 'success')
  }

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Miembros' }]} />
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

      <ContextHeader
        badge="Accesos"
        title="Miembros y permisos de la store"
        description="La acción dominante es invitar un miembro nuevo. Los cambios de rol o estado quedan dentro de la tabla para no competir con el CTA principal."
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
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </AdminLayout>
  )
}
