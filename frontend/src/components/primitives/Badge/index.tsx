import React from 'react'
import { alpha, theme } from '@/app/theme'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'error' | 'info'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, { background: string; color: string }> = {
  neutral: { background: theme.colors.bgHover, color: theme.colors.textSecondary },
  success: { background: theme.colors.statusSuccessSoft, color: theme.colors.success },
  warning: { background: theme.colors.statusWarningSoft, color: theme.colors.warning },
  danger: { background: theme.colors.statusErrorSoft, color: theme.colors.error },
  error: { background: theme.colors.statusErrorSoft, color: theme.colors.error },
  info: { background: theme.colors.statusInfoSoft, color: theme.colors.info }
}

export default function Badge({ variant = 'neutral', style, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px 10px',
        borderRadius: theme.radius.pill,
        fontSize: theme.typography.caption.size,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: 0,
        maxWidth: '100%',
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        textAlign: 'center',
        border: `1px solid ${variant === 'neutral' ? theme.colors.borderDefault : alpha(variants[variant].color, 0.18)}`,
        background: variants[variant].background,
        color: variants[variant].color,
        ...style
      }}
    />
  )
}
