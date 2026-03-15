import React from 'react'
import { theme } from '../theme/theme'

type FormFieldProps = {
  label: string
  helpText?: string
  error?: string
  children: React.ReactNode
}

export default function FormField({ label, helpText, error, children }: FormFieldProps) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: theme.typography.small.size, fontWeight: 600, color: theme.colors.text }}>
        {label}
      </div>
      {children}
      {helpText && !error && (
        <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
          {helpText}
        </div>
      )}
      {error && (
        <div style={{ color: theme.colors.danger, fontSize: theme.typography.small.size }}>
          {error}
        </div>
      )}
    </div>
  )
}
