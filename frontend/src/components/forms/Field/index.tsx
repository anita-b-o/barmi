import React from 'react'
import { theme } from '@/app/theme'

type FieldProps = {
  label: string
  helpText?: string
  error?: string
  children: React.ReactNode
}

export default function Field({ label, helpText, error, children }: FieldProps) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: theme.typography.small.size, fontWeight: 600, color: theme.colors.textPrimary }}>
        {label}
      </div>
      {children}
      {helpText && !error ? (
        <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
          {helpText}
        </div>
      ) : null}
      {error ? (
        <div style={{ color: theme.colors.error, fontSize: theme.typography.small.size }}>
          {error}
        </div>
      ) : null}
    </div>
  )
}
