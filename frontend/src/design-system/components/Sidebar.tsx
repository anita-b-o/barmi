import React from 'react'
import { theme } from '../../app/theme'

export default function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside
      style={{
        padding: theme.spacing.xl,
        borderRight: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface
      }}
    >
      {children}
    </aside>
  )
}
