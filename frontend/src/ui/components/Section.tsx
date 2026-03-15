import React from 'react'
import { theme } from '../theme/theme'

type SectionProps = {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export default function Section({ title, action, children }: SectionProps) {
  return (
    <section style={{ marginTop: theme.spacing.xl }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
          {title && <h2 style={{ margin: 0, fontSize: theme.typography.title.size }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
