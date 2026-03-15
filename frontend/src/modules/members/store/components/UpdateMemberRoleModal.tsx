import { useEffect, useState } from 'react'
import { Button, ErrorAlert, Modal, Select } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import type { StoreMemberRole, StoreMemberRow } from '../types'

type UpdateMemberRoleModalProps = {
  open: boolean
  member: StoreMemberRow | null
  availableRoles: StoreMemberRole[]
  error: string | null
  loading: boolean
  onClose: () => void
  onSave: (payload: { memberId: string; role: StoreMemberRole }) => Promise<void>
}

export function UpdateMemberRoleModal({
  open,
  member,
  availableRoles,
  error,
  loading,
  onClose,
  onSave
}: UpdateMemberRoleModalProps) {
  const [role, setRole] = useState<StoreMemberRole>('STAFF')

  useEffect(() => {
    if (member) {
      setRole(member.role)
    }
  }, [member])

  if (!member) return null

  const handleSubmit = async () => {
    await onSave({
      memberId: member.memberId,
      role
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={`Cambiar rol de ${member.memberEmail}`}>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        {error ? <ErrorAlert message={error} /> : null}
        <Select
          value={role}
          onChange={(event) => setRole(event.target.value as StoreMemberRole)}
          options={availableRoles.map((item) => ({ value: item, label: item }))}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={() => void handleSubmit()} disabled={loading || role === member.role}>
            {loading ? 'Guardando...' : 'Actualizar rol'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
