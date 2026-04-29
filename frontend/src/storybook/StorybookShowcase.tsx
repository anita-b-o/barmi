import React from 'react'
import { theme } from '@/app/theme'

export function ShowcasePage({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.xl }}>
      <div style={{ display: 'grid', gap: theme.spacing.sm }}>
        <div style={{ fontSize: theme.typography.display.size, fontWeight: theme.typography.display.weight, letterSpacing: 0 }}>
          {title}
        </div>
        {description ? (
          <div style={{ maxWidth: 880, color: theme.colors.textSecondary, lineHeight: 1.6 }}>
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  )
}

export function ShowcaseSection({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section style={{ display: 'grid', gap: theme.spacing.md }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontSize: theme.typography.title.size, fontWeight: theme.typography.title.weight }}>
          {title}
        </div>
        {description ? (
          <div style={{ color: theme.colors.textSecondary, lineHeight: 1.6 }}>
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function ShowcaseGrid({
  children,
  min = 220
}: {
  children: React.ReactNode
  min?: number
}) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  )
}

export function TokenSwatch({
  label,
  value,
  textColor
}: {
  label: string
  value: string
  textColor?: string
}) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.sm }}>
      <div
        style={{
          minHeight: 96,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.borderDefault}`,
          background: value,
          color: textColor ?? theme.colors.textPrimary,
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'flex-end'
        }}
      >
        <strong>{label}</strong>
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ fontSize: theme.typography.small.size, color: theme.colors.textSecondary }}>{label}</div>
        <code style={{ fontSize: theme.typography.small.size, color: theme.colors.textMuted }}>{value}</code>
      </div>
    </div>
  )
}
