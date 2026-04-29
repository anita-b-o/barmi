import Button from '@/components/primitives/Button'
import type { StoreMemberStatus } from '../types'

type UpdateMemberStatusActionProps = {
  currentStatus: StoreMemberStatus
  disabled: boolean
  loading: boolean
  onToggle: () => void
}

export function UpdateMemberStatusAction({
  currentStatus,
  disabled,
  loading,
  onToggle
}: UpdateMemberStatusActionProps) {
  const nextLabel = currentStatus === 'ACTIVE' ? 'Desactivar' : 'Activar'

  return (
    <Button
      variant="ghost"
      disabled={disabled || loading}
      onClick={onToggle}
    >
      {loading ? 'Guardando...' : nextLabel}
    </Button>
  )
}
