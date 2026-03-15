import React from 'react'
import { theme } from '../theme/theme'

type KeyValueItem = {
  label: string
  value: React.ReactNode
}

type KeyValueListProps = {
  items: KeyValueItem[]
}

export default function KeyValueList({ items }: KeyValueListProps) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
          <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>{item.label}</div>
          <div style={{ fontWeight: 600, textAlign: 'right' }}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
