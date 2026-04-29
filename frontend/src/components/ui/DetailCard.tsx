import React from 'react'
import Card from './Card'
import { theme } from '@/app/theme'

type DetailCardProps = {
  title?: string
  subtitle?: string
  children: React.ReactNode
}

export default function DetailCard({ title, subtitle, children }: DetailCardProps) {
  return (
    <Card>
      {(title || subtitle) && (
        <div style={{ marginBottom: theme.spacing.lg }}>
          {title && <div style={{ fontSize: theme.typography.title.size, fontWeight: 600 }}>{title}</div>}
          {subtitle && <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </Card>
  )
}
