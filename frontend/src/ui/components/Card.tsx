import React, { useState } from 'react'
import { theme } from '../theme/theme'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'surface' | 'soft'
}

export default function Card({ variant = 'surface', style, ...props }: CardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const background = variant === 'soft' ? theme.colors.surfaceAlt : theme.colors.surface
  return (
    <div
      {...props}
      onMouseEnter={(event) => {
        setIsHovered(true)
        props.onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setIsHovered(false)
        props.onMouseLeave?.(event)
      }}
      style={{
        background,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.xl,
        boxShadow: isHovered ? theme.shadows.medium : theme.shadows.soft,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        ...style
      }}
    />
  )
}
