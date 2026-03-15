import React, { useState } from 'react'
import { theme } from '../theme/theme'

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>

const baseStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: theme.radius.md,
  border: `1px solid ${theme.colors.border}`,
  background: theme.colors.surface,
  color: theme.colors.text,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body.size,
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease'
}

export default function TextInput({ style, ...props }: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const isDisabled = Boolean(props.disabled)

  const stateStyle: React.CSSProperties = isDisabled
    ? { background: theme.colors.surfaceAlt, color: theme.colors.textMuted, cursor: 'not-allowed' }
    : isFocused
      ? { borderColor: theme.colors.primary, boxShadow: `0 0 0 3px ${theme.colors.primarySoft}` }
      : isHovered
        ? { borderColor: theme.colors.primaryHover }
        : {}

  return (
    <input
      {...props}
      onFocus={(event) => {
        setIsFocused(true)
        props.onFocus?.(event)
      }}
      onBlur={(event) => {
        setIsFocused(false)
        props.onBlur?.(event)
      }}
      onMouseEnter={(event) => {
        setIsHovered(true)
        props.onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setIsHovered(false)
        props.onMouseLeave?.(event)
      }}
      style={{
        ...baseStyle,
        ...stateStyle,
        ...style
      }}
    />
  )
}
