import React from 'react'
import { theme } from '../theme/theme'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at top left, ${theme.colors.primarySoft} 0%, ${theme.colors.background} 28%)`,
        color: theme.colors.text
      }}
    >
      <div style={{ padding: theme.spacing.xl, borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}>
        <div style={{ fontWeight: 700, fontSize: 22, color: theme.colors.text }}>Barmi</div>
      </div>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: theme.spacing.xxl }}>{children}</main>
    </div>
  )
}
