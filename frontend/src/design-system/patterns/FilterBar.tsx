import React from 'react'
import Card from '../components/Card'
import { theme } from '../../app/theme'

export default function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <Card style={{ display: 'grid', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
      {children}
    </Card>
  )
}
