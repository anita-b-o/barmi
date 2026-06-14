import React from 'react'
import { theme } from '@/app/theme'

export default function Sidebar({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <aside
      style={{
        padding: `${theme.spacing.xl}px ${theme.spacing.lg}px`,
        borderRight: `1px solid ${theme.colors.borderDefault}`,
        background: theme.colors.bgSurfaceAlt,
        color: theme.colors.textPrimary,
        boxShadow: 'none',
        ...style
      }}
    >
      {children}
    </aside>
  )
}
