import React from 'react'
import { theme } from '@/app/theme'

export default function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside
      style={{
        padding: `${theme.spacing.xl}px ${theme.spacing.lg}px`,
        borderRight: `1px solid ${theme.colors.borderDefault}`,
        background: theme.colors.bgSurfaceAlt,
        color: theme.colors.bgSurfaceAlt,
        boxShadow: 'none'
      }}
    >
      {children}
    </aside>
  )
}
