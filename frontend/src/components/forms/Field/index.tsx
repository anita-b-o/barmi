import React from 'react'
import { theme } from '@/app/theme'

type FieldProps = {
  label: string
  helpText?: string
  hint?: string
  error?: string
  children: React.ReactNode
}

export default function Field({ label, helpText, hint, error, children }: FieldProps) {
  const supportText = helpText ?? hint

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: theme.typography.small.size, fontWeight: 600, color: theme.colors.textPrimary }}>
        {label}
      </div>
      {children}
      {supportText && !error ? (
        <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
          {supportText}
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
