import React from 'react'
import { theme } from '@/app/theme'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'surface' | 'soft' | 'inverse'
}

export default function Card({ variant = 'surface', style, ...props }: CardProps) {
  const background = variant === 'inverse'
    ? theme.colors.bgSurface
    : variant === 'soft'
      ? theme.colors.bgHover
      : theme.colors.bgSurfaceAlt
  const borderColor = variant === 'inverse'
    ? theme.colors.borderDefault
    : variant === 'soft'
      ? theme.colors.borderStrong
      : theme.colors.borderDefault

  return (
    <div
      {...props}
      style={{
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: `var(--store-card-radius, ${theme.radius.lg}px)`,
        padding: theme.spacing.xl,
        boxShadow: theme.shadows.surface,
        transition: 'border-color 160ms ease, box-shadow 160ms ease, background 160ms ease, transform 160ms ease',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    />
  )
}
