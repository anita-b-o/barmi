import { useEffect, useState } from 'react'
import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import Modal from '@/components/primitives/Modal'
import Select from '@/components/primitives/Select'
import ErrorAlert from '@/components/feedback/ErrorState'
import { theme } from '@/app/theme'
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
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setMemberEmail('')
      setRole(availableRoles[0] ?? 'STAFF')
      setLocalError(null)
      return
    }
    setRole((current) => (availableRoles.includes(current) ? current : (availableRoles[0] ?? 'STAFF')))
  }, [availableRoles, open])

  const handleSubmit = async () => {
    const normalizedEmail = memberEmail.trim()

    if (!normalizedEmail) {
      setLocalError('El email del miembro es obligatorio')
      return
    }

    if (!normalizedEmail.includes('@')) {
      setLocalError('Ingresá un email válido')
      return
    }

    if (!availableRoles.includes(role)) {
      setLocalError('Seleccioná un rol válido')
      return
    }

    setLocalError(null)
    await onCreate({
      memberEmail: normalizedEmail,
      role
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Invitar miembro">
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        {localError || error ? <ErrorAlert message={localError ?? error ?? 'Error inesperado'} /> : null}
        <Input
          value={memberEmail}
          onChange={(event) => {
            setMemberEmail(event.target.value)
            setLocalError(null)
          }}
          placeholder="user@example.com"
          type="email"
        />
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
          <Button onClick={() => void handleSubmit()} disabled={loading || !memberEmail.trim() || availableRoles.length === 0}>
            {loading ? 'Guardando...' : 'Crear miembro'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
