import React from 'react'
import Card from './Card'
import { theme } from '@/app/theme'

type MetricCardProps = {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'error'
}

const toneMap: Record<NonNullable<MetricCardProps['tone']>, string> = {
  neutral: theme.colors.textPrimary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.error,
  error: theme.colors.error
}

export default function MetricCard({ label, value, tone = 'neutral' }: MetricCardProps) {
  return (
    <Card style={{ background: theme.colors.bgSurface }}>
      <div style={{ color: theme.colors.textMuted, marginBottom: 6, fontSize: theme.typography.small.size }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 22, color: toneMap[tone] }}>{value}</div>
    </Card>
  )
}
