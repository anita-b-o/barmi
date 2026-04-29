import React from 'react'
import Button from '@/components/primitives/Button'
import { alpha, theme } from '@/app/theme'

type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false
}: EmptyStateProps) {
  return (
    <div
      style={{
        padding: `${theme.spacing.xl}px ${theme.spacing.lg}px`,
        textAlign: 'center',
        color: theme.colors.textMuted,
        background: theme.colors.bgSurfaceAlt,
        borderRadius: theme.radius.xl,
        border: `1px solid ${alpha(theme.colors.secondary, 0.08)}`,
        boxShadow: 'none',
        display: 'grid',
        gap: theme.spacing.sm,
        justifyItems: 'center'
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.pill,
          background: theme.colors.bgSurfaceAlt,
          border: `1px solid ${alpha(theme.colors.brand, 0.12)}`
        }}
      />
      <div style={{ fontWeight: 700, color: theme.colors.textPrimary, fontSize: 18, letterSpacing: 0 }}>{title}</div>
      {description ? <div style={{ maxWidth: 620, lineHeight: 1.55, color: theme.colors.textSecondary }}>{description}</div> : null}
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
