import React, { useState } from 'react'
import { theme } from '@/app/theme'

type SelectOption = {
  value: string
  label: string
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[]
}

const baseStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '11px 12px',
  borderRadius: `var(--store-input-radius, ${theme.radius.md}px)`,
  border: `1px solid ${theme.colors.borderDefault}`,
  background: theme.colors.bgSurfaceAlt,
  color: theme.colors.textPrimary,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body.size,
  outline: 'none',
  transition: 'border-color 160ms ease, box-shadow 160ms ease',
  boxSizing: 'border-box'
}

export default function Select({ options, style, ...props }: SelectProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const isDisabled = Boolean(props.disabled)

  const stateStyle: React.CSSProperties = isDisabled
    ? { background: theme.colors.bgSurface, color: theme.colors.textMuted, cursor: 'not-allowed' }
    : isFocused
      ? { borderColor: `var(--store-action, ${theme.colors.actionPrimary})`, boxShadow: `0 0 0 3px ${theme.colors.focusRing}` }
      : isHovered
        ? { borderColor: theme.colors.borderStrong }
        : {}

  return (
    <select
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
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}
