import React from 'react'
import { alpha, getContextPalette, theme, type VisualContext } from '@/app/theme'

type TopbarProps = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  eyebrow?: string
  tone?: VisualContext
}

export default function Topbar({ title, subtitle, actions, eyebrow, tone = 'admin' }: TopbarProps) {
  const palette = getContextPalette(tone)

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.lg,
        padding: `${theme.spacing.xl}px ${theme.spacing.xxl}px`,
        borderBottom: `1px solid ${theme.colors.borderDefault}`,
        background: theme.colors.bgSurfaceAlt,
        backdropFilter: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}
    >
      <div>
        {eyebrow ? <div style={{ color: palette.accent, fontSize: theme.typography.small.size, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', marginBottom: 4 }}>{eyebrow}</div> : null}
        <div style={{ fontWeight: 700, fontSize: theme.typography.title.size, color: theme.colors.textPrimary }}>{title}</div>
        {subtitle ? <div style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: theme.typography.small.size }}>{subtitle}</div> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: theme.spacing.md }}>{actions}</div> : null}
    </header>
  )
}
