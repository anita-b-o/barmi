import { useEffect, useState } from 'react'
import { Button, ErrorAlert, Input, Modal, Select } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import type { StoreMemberRole } from '../types'

type CreateMemberModalProps = {
  open: boolean
  availableRoles: StoreMemberRole[]
  error: string | null
  loading: boolean
  onClose: () => void
  onCreate: (payload: { memberEmail: string; role: StoreMemberRole }) => Promise<void>
}

export function CreateMemberModal({
  open,
  availableRoles,
  error,
  loading,
  onClose,
  onCreate
}: CreateMemberModalProps) {
  const [memberEmail, setMemberEmail] = useState('')
  const [role, setRole] = useState<StoreMemberRole>(availableRoles[0] ?? 'STAFF')

  useEffect(() => {
    if (!open) {
      setMemberEmail('')
      setRole(availableRoles[0] ?? 'STAFF')
      return
    }
    setRole((current) => (availableRoles.includes(current) ? current : (availableRoles[0] ?? 'STAFF')))
  }, [availableRoles, open])

  const handleSubmit = async () => {
    await onCreate({
      memberEmail: memberEmail.trim(),
      role
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Invitar miembro">
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        {error ? <ErrorAlert message={error} /> : null}
        <Input
          value={memberEmail}
          onChange={(event) => setMemberEmail(event.target.value)}
          placeholder="user@example.com"
          type="email"
        />
        <Select
          value={role}
          onChange={(event) => setRole(event.target.value as StoreMemberRole)}
          options={availableRoles.map((item) => ({ value: item, label: item }))}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? 'Guardando...' : 'Crear miembro'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
