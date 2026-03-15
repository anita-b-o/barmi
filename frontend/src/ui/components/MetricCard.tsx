import React from 'react'
import Card from './Card'
import { theme } from '../theme/theme'

type MetricCardProps = {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

const toneMap: Record<NonNullable<MetricCardProps['tone']>, string> = {
  neutral: theme.colors.text,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger
}

export default function MetricCard({ label, value, tone = 'neutral' }: MetricCardProps) {
  return (
    <Card style={{ background: tone === 'neutral' ? theme.colors.surface : theme.colors.surfaceAlt }}>
      <div style={{ color: theme.colors.textMuted, marginBottom: 6, fontSize: theme.typography.small.size }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 22, color: toneMap[tone] }}>{value}</div>
    </Card>
  )
}
