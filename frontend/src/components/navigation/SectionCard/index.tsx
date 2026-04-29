import React from 'react'
import Card from '@/components/primitives/Card'
import { alpha, theme } from '@/app/theme'

type SectionCardProps = {
  title: string
  action?: React.ReactNode
  description?: string
  children: React.ReactNode
}

export default function SectionCard({ title, action, description, children }: SectionCardProps) {
  return (
    <Card style={{ borderColor: alpha(theme.colors.secondary, 0.08) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.lg, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 700, color: theme.colors.secondary, letterSpacing: 0, fontSize: theme.typography.title.size }}>{title}</div>
          {description ? <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size, lineHeight: 1.5 }}>{description}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}
