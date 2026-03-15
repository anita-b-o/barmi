import React from 'react'
import Card from '../components/Card'
import { theme } from '../../app/theme'

type OrderSummaryRow = {
  label: string
  value: React.ReactNode
}

type OrderSummaryProps = {
  title?: string
  rows: OrderSummaryRow[]
}

export default function OrderSummary({ title = 'Resumen', rows }: OrderSummaryProps) {
  return (
    <Card>
      <div style={{ fontSize: theme.typography.title.size, fontWeight: 600, marginBottom: theme.spacing.lg }}>{title}</div>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md }}>
            <span style={{ color: theme.colors.textMuted }}>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </Card>
  )
}
