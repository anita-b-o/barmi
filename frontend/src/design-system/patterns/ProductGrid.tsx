import React from 'react'
import { theme } from '../../app/theme'

export default function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {children}
    </div>
  )
}
