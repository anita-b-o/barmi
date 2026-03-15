import React from 'react'
import { theme } from '../theme/theme'

type PageHeaderProps = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: theme.spacing.xl }}>
      <div>
        <h1 style={{ margin: 0, fontSize: theme.typography.display.size, fontWeight: theme.typography.display.weight }}>
          {title}
        </h1>
        {subtitle && (
          <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{subtitle}</div>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}
