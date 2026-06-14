import React from 'react'
import { getContextPalette, theme, type VisualContext } from '@/app/theme'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  eyebrow?: string
  tone?: VisualContext
}

export default function SectionHeader({ title, subtitle, actions, eyebrow, tone = 'neutral' }: SectionHeaderProps) {
  const palette = getContextPalette(tone)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${theme.colors.borderDefault}`
      }}
    >
      <div>
        {eyebrow ? (
          <div style={{ marginBottom: theme.spacing.xs, color: palette.accent, fontWeight: 700, fontSize: theme.typography.small.size, letterSpacing: 0, textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        ) : null}
        <h1
          style={{
            margin: 0,
            fontSize: theme.typography.display.size,
            fontWeight: theme.typography.display.weight,
            lineHeight: 1.1,
            letterSpacing: 0,
            color: theme.colors.textPrimary
          }}
        >
          {title}
        </h1>
        {subtitle ? <div style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 1.6 }}>{subtitle}</div> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>{actions}</div> : null}
    </div>
  )
}
