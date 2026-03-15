import React from 'react'
import Card from '../components/Card'
import { theme } from '../../app/theme'

type FormSectionProps = {
  title: string
  description?: string
  children: React.ReactNode
}

export default function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Card>
      <div style={{ marginBottom: theme.spacing.lg }}>
        <div style={{ fontSize: theme.typography.title.size, fontWeight: theme.typography.title.weight }}>{title}</div>
        {description && <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{description}</div>}
      </div>
      <div style={{ display: 'grid', gap: theme.spacing.lg }}>{children}</div>
    </Card>
  )
}
