import React, { useState } from 'react'
import { theme } from '@/app/theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseStyle: React.CSSProperties = {
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.label.size,
  fontWeight: 600,
  borderRadius: theme.radius.md,
  padding: '11px 16px',
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  letterSpacing: 0,
  minHeight: 44,
  textDecoration: 'none',
  whiteSpace: 'normal',
  textAlign: 'center',
  maxWidth: '100%'
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: theme.colors.actionPrimary,
    color: theme.mode === 'dark' ? theme.colors.textPrimary : theme.colors.bgSurfaceAlt,
    borderColor: theme.colors.actionPrimary
  },
  secondary: {
    background: theme.colors.bgSurfaceAlt,
    color: theme.colors.textPrimary,
    borderColor: theme.colors.borderDefault
  },
  ghost: {
    background: 'transparent',
    color: theme.colors.textPrimary,
    borderColor: 'transparent'
  }
}

export default function Button({ variant = 'secondary', style, ...props }: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const disabledStyle: React.CSSProperties = props.disabled
    ? {
      cursor: 'not-allowed',
      boxShadow: 'none',
      transform: 'none',
      filter: 'none',
      background: variant === 'primary' ? theme.colors.actionDisabled : theme.colors.bgSurface,
      borderColor: variant === 'ghost' ? 'transparent' : theme.colors.actionDisabled,
      color: theme.colors.textMuted
    }
    : {}

  const hoverStyle: React.CSSProperties = props.disabled
    ? {}
    : {
      primary: { background: theme.colors.actionHover, borderColor: theme.colors.actionHover, boxShadow: theme.shadows.surface },
      secondary: { background: theme.colors.bgHover, borderColor: theme.colors.borderHover, color: theme.colors.textPrimary },
      ghost: { background: theme.colors.bgAccentSoft, color: theme.colors.brand }
    }[variant]

  const focusStyle: React.CSSProperties = isFocused
    ? { boxShadow: `0 0 0 3px ${theme.colors.focusRing}` }
    : {}

  const activeStyle: React.CSSProperties = isPressed && !props.disabled
    ? {
      transform: 'translateY(1px)',
      background: variant === 'primary' ? theme.colors.actionHover : undefined,
      boxShadow: 'none'
    }
    : {}

  return (
    <button
      {...props}
      aria-busy={props['aria-busy'] ?? false}
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
        setIsPressed(false)
        props.onBlur?.(event)
      }}
      onMouseDown={(event) => {
        setIsPressed(true)
        props.onMouseDown?.(event)
      }}
      onMouseUp={(event) => {
        setIsPressed(false)
        props.onMouseUp?.(event)
      }}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...(isHovered ? hoverStyle : {}),
        ...focusStyle,
        ...activeStyle,
        ...disabledStyle,
        ...style
      }}
    />
  )
}
