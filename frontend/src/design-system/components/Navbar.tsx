import React from 'react'
import { theme } from '../../app/theme'

type NavbarProps = {
  title: string
  actions?: React.ReactNode
}

export default function Navbar({ title, actions }: NavbarProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        borderBottom: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface
      }}
    >
      <div style={{ fontWeight: 700, fontSize: theme.typography.title.size }}>{title}</div>
      {actions && <div style={{ display: 'flex', gap: theme.spacing.md }}>{actions}</div>}
    </header>
  )
}
