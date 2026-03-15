import React, { useState } from 'react'
import { theme } from '../theme/theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseStyle: React.CSSProperties = {
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body.size,
  fontWeight: 600,
  borderRadius: theme.radius.md,
  padding: '11px 18px',
  border: `1px solid ${theme.colors.border}`,
  cursor: 'pointer',
  transition: 'all 0.22s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  letterSpacing: '-0.01em'
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: theme.colors.primary,
    color: '#fff',
    borderColor: theme.colors.primary,
    boxShadow: theme.shadows.soft
  },
  secondary: {
    background: theme.colors.surfaceAlt,
    color: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  ghost: {
    background: 'transparent',
    color: theme.colors.primary,
    borderColor: 'transparent'
  }
}

export default function Button({ variant = 'secondary', style, ...props }: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const disabledStyle: React.CSSProperties = props.disabled
    ? { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none', transform: 'none' }
    : {}

  const hoverStyle: React.CSSProperties = props.disabled
    ? {}
    : {
      primary: { background: theme.colors.primaryHover, borderColor: theme.colors.primaryHover, transform: 'translateY(-1px)' },
      secondary: { background: '#F7DDE1', color: theme.colors.primary, transform: 'translateY(-1px)' },
      ghost: { background: theme.colors.surfaceAlt, color: theme.colors.primary }
    }[variant]

  const focusStyle: React.CSSProperties = isFocused
    ? { boxShadow: `0 0 0 3px ${theme.colors.primarySoft}` }
    : {}

  return (
    <button
      {...props}
      onMouseEnter={(event) => {
        setIsHovered(true)
        props.onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setIsHovered(false)
        props.onMouseLeave?.(event)
      }}
      onFocus={(event) => {
        setIsFocused(true)
        props.onFocus?.(event)
      }}
      onBlur={(event) => {
        setIsFocused(false)
        props.onBlur?.(event)
      }}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...(isHovered ? hoverStyle : {}),
        ...focusStyle,
        ...disabledStyle,
        ...style
      }}
    />
  )
}
