import { useEffect, useState } from 'react'
import Button from '@/components/primitives/Button'
import Modal from '@/components/primitives/Modal'
import Select from '@/components/primitives/Select'
import ErrorAlert from '@/components/feedback/ErrorState'
import { theme } from '@/app/theme'
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
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (member) {
      setRole(member.role)
      setLocalError(null)
    }
  }, [member])

  if (!member) return null

  const handleSubmit = async () => {
    if (!availableRoles.includes(role)) {
      setLocalError('Seleccioná un rol válido')
      return
    }

    setLocalError(null)
    await onSave({
      memberId: member.memberId,
      role
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={`Cambiar rol de ${member.memberEmail}`}>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        {localError || error ? <ErrorAlert message={localError ?? error ?? 'Error inesperado'} /> : null}
        <Select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as StoreMemberRole)
            setLocalError(null)
          }}
          options={availableRoles.map((item) => ({ value: item, label: item }))}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={() => void handleSubmit()} disabled={loading || role === member.role || availableRoles.length === 0}>
            {loading ? 'Guardando...' : 'Actualizar rol'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
