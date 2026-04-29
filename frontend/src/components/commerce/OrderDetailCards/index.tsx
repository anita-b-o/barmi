import React from 'react'
import Card from '@/components/primitives/Card'
import Table from '@/components/primitives/Table'
import { theme } from '@/app/theme'

type DetailRow = {
  label: string
  value: React.ReactNode
}

type DetailTable = {
  headers: string[]
  rows: React.ReactNode[][]
  emptyMessage?: string
}

type DetailSection = {
  title?: string
  rows?: DetailRow[]
  table?: DetailTable
  content?: React.ReactNode
}

type OrderDetailCardsProps = {
  sections: DetailSection[]
}

export default function OrderDetailCards({ sections }: OrderDetailCardsProps) {
  return (
    <div style={{ display: 'grid', gap: theme.spacing.xl }}>
      {sections.map((section, index) => {
        if (section.table) {
          return (
            <Table
              key={`table-${index}`}
              headers={section.table.headers}
              rows={section.table.rows}
              emptyMessage={section.table.emptyMessage}
            />
          )
        }

        return (
          <Card key={`card-${index}`}>
            {section.title ? (
              <div style={{ fontSize: theme.typography.title.size, fontWeight: 600, marginBottom: theme.spacing.lg }}>
                {section.title}
              </div>
            ) : null}

            {section.rows ? (
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                {section.rows.map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                    <span style={{ color: theme.colors.textMuted }}>{row.label}</span>
                    {React.isValidElement(row.value) ? row.value : <strong>{row.value}</strong>}
                  </div>
                ))}
              </div>
            ) : section.content}
          </Card>
        )
      })}
    </div>
  )
}
