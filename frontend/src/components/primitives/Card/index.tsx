import React from 'react'
import { theme } from '@/app/theme'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'surface' | 'soft'
}

export default function Card({ variant = 'surface', style, ...props }: CardProps) {
  const background = variant === 'soft' ? theme.colors.bgSurfaceAlt : theme.colors.bgSurface
  const borderColor = variant === 'soft' ? theme.colors.borderStrong : theme.colors.borderDefault

  return (
    <div
      {...props}
      style={{
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.xl,
        boxShadow: 'none',
        transition: 'none',
        transform: 'none',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    />
  )
}
