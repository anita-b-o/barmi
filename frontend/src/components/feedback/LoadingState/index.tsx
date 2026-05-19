import React from 'react'
import { alpha, theme } from '@/app/theme'

export default function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
        color: theme.colors.textMuted,
        fontSize: theme.typography.body.size,
        background: theme.colors.bgSurfaceAlt,
        border: `1px solid ${theme.colors.borderDefault}`,
        borderRadius: theme.radius.lg,
        boxShadow: 'none'
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: theme.radius.md,
          background: alpha(theme.colors.brand, 0.05),
          border: `1px solid ${alpha(theme.colors.brand, 0.16)}`
        }}
      />
      <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>{label}</div>
      <div style={{ color: theme.colors.textMuted, lineHeight: 1.55 }}>
        Estamos preparando la información para esta vista.
      </div>
    </div>
  )
}
