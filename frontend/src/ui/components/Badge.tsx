import React from 'react'
import { theme } from '../theme/theme'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, { background: string; color: string }> = {
  neutral: { background: theme.colors.surfaceAlt, color: theme.colors.textMuted },
  success: { background: '#E8F6F0', color: theme.colors.success },
  warning: { background: '#FAECEE', color: theme.colors.warning },
  danger: { background: '#FDECEC', color: theme.colors.danger },
  info: { background: '#EEF2FF', color: theme.colors.info }
}

export default function Badge({ variant = 'neutral', style, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: theme.radius.pill,
        fontSize: theme.typography.small.size,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '0.02em',
        background: variants[variant].background,
        color: variants[variant].color,
        ...style
      }}
    />
  )
}
