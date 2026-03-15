import React, { useState } from 'react'
import Card from './Card'
import { theme } from '../theme/theme'
import EmptyState from './EmptyState'

type DataTableProps = {
  headers: string[]
  rows: React.ReactNode[][]
  emptyMessage?: string
}

export default function DataTable({ headers, rows, emptyMessage }: DataTableProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {rows.length === 0 ? (
        <div style={{ padding: theme.spacing.xl }}>
          <EmptyState title={emptyMessage ?? 'Sin resultados'} />
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: theme.colors.surfaceAlt }}>
              {headers.map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: theme.typography.small.size,
                    color: theme.colors.textMuted,
                    fontWeight: 600,
                    letterSpacing: 0.2
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  borderTop: `1px solid ${theme.colors.border}`,
                  background: hoveredRow === rowIndex ? theme.colors.surfaceAlt : 'transparent',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{ padding: '14px 16px', fontSize: theme.typography.body.size }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
