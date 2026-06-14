import React from 'react'
import Button from '@/components/primitives/Button'
import { alpha, theme } from '@/app/theme'

type ErrorStateProps = {
  message: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}

export default function ErrorState({ message, actionLabel, onAction, actionDisabled = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        background: alpha(theme.colors.error, 0.08),
        border: `1px solid ${alpha(theme.colors.error, 0.22)}`,
        color: theme.colors.error,
        padding: theme.spacing.xl,
        borderRadius: theme.radius.lg,
        fontSize: theme.typography.body.size,
        boxShadow: 'none',
        display: 'grid',
        gap: theme.spacing.md
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: theme.radius.pill,
          background: alpha(theme.colors.error, 0.12),
          border: `1px solid ${alpha(theme.colors.error, 0.16)}`
        }}
      />
      <div style={{ fontWeight: 600 }}>No pudimos cargar esta vista</div>
      <div style={{ lineHeight: 1.6 }}>{message}</div>
      {actionLabel && onAction ? (
        <div>
          <Button variant="secondary" onClick={onAction} disabled={actionDisabled}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
