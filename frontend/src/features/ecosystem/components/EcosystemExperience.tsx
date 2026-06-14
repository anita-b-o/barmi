import type { CSSProperties, ReactNode } from 'react'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import { alpha, theme } from '@/app/theme'

type EcosystemSurfaceSectionProps = {
  children: ReactNode
  style?: CSSProperties
  tone?: 'default' | 'warm'
}

type EcosystemHeroSectionProps = {
  eyebrow?: string
  title: string
  description: string
  badges?: ReactNode
  actions?: ReactNode
  aside?: ReactNode
  style?: CSSProperties
}

export function EcosystemSurfaceSection({
  children,
  style
}: EcosystemSurfaceSectionProps) {
  return (
    <Card
      style={{
        padding: theme.spacing.xxl,
        borderColor: alpha(theme.colors.textPrimary, 0.08),
        boxShadow: 'none',
        background: theme.colors.bgSurfaceAlt,
        ...style
      }}
    >
      {children}
    </Card>
  )
}

export function EcosystemHeroSection({
  eyebrow = 'Marketplace ecosystem',
  title,
  description,
  badges,
  actions,
  aside,
  style
}: EcosystemHeroSectionProps) {
  return (
    <Card
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: theme.spacing.xxl,
        borderColor: alpha(theme.colors.actionPrimary, 0.12),
        background: theme.colors.bgSurfaceAlt,
        boxShadow: 'none',
        ...style
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: theme.spacing.xl,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'grid', gap: theme.spacing.md, maxWidth: 820 }}>
          <div style={{ display: 'grid', gap: theme.spacing.sm }}>
            <div
              style={{
                fontSize: theme.typography.small.size,
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                color: theme.colors.actionPrimary
              }}
            >
              {eyebrow}
            </div>
            <div style={{ display: 'grid', gap: theme.spacing.sm }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 42px)', lineHeight: 1.02, letterSpacing: 0, color: theme.colors.textPrimary }}>
                {title}
              </h1>
              <p style={{ margin: 0, color: theme.colors.textMuted, fontSize: 16, lineHeight: 1.6 }}>
                {description}
              </p>
            </div>
          </div>
          {badges ? <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>{badges}</div> : null}
          {actions ? <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>{actions}</div> : null}
        </div>

        {aside ? (
          <div
            style={{
              minWidth: 260,
              maxWidth: 360,
              flex: '1 1 300px',
              display: 'grid',
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              border: `1px solid ${alpha(theme.colors.actionPrimary, 0.12)}`,
              background: alpha(theme.colors.bgSurface, 0.88),
              boxShadow: 'none'
            }}
          >
            {aside}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export function EcosystemHeroBadge({ children, variant = 'neutral' }: { children: ReactNode; variant?: 'neutral' | 'info' | 'success' }) {
  return (
    <Badge
      variant={variant}
      style={{
        background: variant === 'info'
          ? alpha(theme.colors.actionPrimary, 0.12)
          : variant === 'success'
            ? alpha(theme.colors.accent, 0.14)
            : alpha(theme.colors.bgSurface, 0.8),
        color: variant === 'success' ? theme.colors.accent : theme.colors.textPrimary,
        border: `1px solid ${variant === 'success' ? alpha(theme.colors.accent, 0.16) : alpha(theme.colors.actionPrimary, 0.08)}`
      }}
    >
      {children}
    </Badge>
  )
}
