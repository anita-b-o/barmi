import React from 'react'
import Card from './Card'
import { theme } from '../../app/theme'

type ModalProps = {
  open?: boolean
  isOpen?: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ open, isOpen, title, onClose, children }: ModalProps) {
  const visible = open ?? isOpen ?? false
  if (!visible) return null

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
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 520 }}>
        <Card>
          {title && (
            <div style={{ fontSize: theme.typography.title.size, fontWeight: 600, marginBottom: theme.spacing.lg }}>
              {title}
            </div>
          )}
          <div style={{ display: 'grid', gap: theme.spacing.md }}>{children}</div>
        </Card>
      </div>
    </div>
  )
}
