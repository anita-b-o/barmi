import React from 'react'
import { theme } from '../theme/theme'

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.textMuted, background: theme.colors.surfaceAlt, borderRadius: theme.radius.lg }}>
      <div style={{ fontWeight: 600, color: theme.colors.text }}>{title}</div>
      {description && <div style={{ marginTop: 6 }}>{description}</div>}
    </div>
  )
}
