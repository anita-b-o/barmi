import React from 'react'
import Card from '../components/Card'
import { theme } from '../../app/theme'

type SectionCardProps = {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

export default function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {action}
      </div>
      {children}
    </Card>
  )
}
