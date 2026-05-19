import React from 'react'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import { theme } from '@/app/theme'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  confirmDisabled?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  confirmDisabled
}: ConfirmDialogProps) {
  const bodyMessage = description ?? message ?? ''

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.35)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
        padding: theme.spacing.lg
      }}
      onClick={onCancel}
    >
      <div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 420 }}>
        <Card>
          <div style={{ fontSize: theme.typography.title.size, fontWeight: 600 }}>{title}</div>
          <div style={{ marginTop: 8, color: theme.colors.textMuted }}>{bodyMessage}</div>
          <div style={{ marginTop: theme.spacing.lg, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
            <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
