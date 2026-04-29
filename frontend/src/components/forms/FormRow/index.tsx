import React from 'react'
import { theme } from '@/app/theme'

export default function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      {children}
    </div>
  )
}
