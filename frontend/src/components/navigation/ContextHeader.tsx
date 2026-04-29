import type { ReactNode } from 'react'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import { alpha, getContextPalette, theme, type VisualContext } from '@/app/theme'

type ContextHeaderProps = {
  badge?: string
  title: string
  description: string
  action?: ReactNode
  tone?: VisualContext
}

export default function ContextHeader({ badge, title, description, action, tone = 'neutral' }: ContextHeaderProps) {
  const palette = getContextPalette(tone)

  return (
    <Card
      variant="soft"
      style={{
        marginBottom: theme.spacing.xl,
        display: 'flex',
        justifyContent: 'space-between',
        gap: theme.spacing.lg,
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: theme.spacing.xxl,
        background: theme.colors.bgSurfaceAlt,
        borderColor: alpha(palette.accent, 0.16)
      }}
    >
      <div style={{ maxWidth: 720 }}>
        {badge ? <Badge variant="info" style={{ marginBottom: theme.spacing.sm, color: palette.accent, background: alpha(palette.accent, 0.12) }}>{badge}</Badge> : null}
        <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0 }}>{title}</div>
        <div style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 1.6 }}>{description}</div>
      </div>
      {action ? <div>{action}</div> : null}
    </Card>
  )
}
