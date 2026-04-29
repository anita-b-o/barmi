import React from 'react'
import Card from '@/components/primitives/Card'
import { theme } from '@/app/theme'

export default function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <Card
      style={{
        display: 'grid',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        padding: theme.spacing.lg,
        background: theme.colors.bgSurfaceAlt
      }}
    >
      {children}
    </Card>
  )
}
