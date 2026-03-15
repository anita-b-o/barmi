import React from 'react'
import { theme } from '../theme/theme'

export default function LoadingBlock({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div style={{ padding: theme.spacing.lg, color: theme.colors.textMuted, fontSize: theme.typography.body.size, background: theme.colors.surfaceAlt, borderRadius: theme.radius.md }}>
      {label}
    </div>
  )
}
