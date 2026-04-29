import React, { useState } from 'react'
import Card from '@/components/primitives/Card'
import EmptyState from '@/components/feedback/EmptyState'
import { theme } from '@/app/theme'

type TableProps = {
  headers: string[]
  rows: React.ReactNode[][]
  emptyMessage?: string
}

export default function Table({ headers, rows, emptyMessage }: TableProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const headerBackground = theme.colors.bgSurfaceAlt
  const hoveredRowBackground = theme.colors.bgHover

  return (
    <Card style={{ padding: 0, overflowX: 'auto' }}>
      {rows.length === 0 ? (
        <div style={{ padding: theme.spacing.xl }}>
          <EmptyState title={emptyMessage ?? 'Sin resultados'} />
        </div>
      ) : (
        <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: headerBackground }}>
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
                  borderTop: `1px solid ${theme.colors.borderDefault}`,
                  background: hoveredRow === rowIndex ? hoveredRowBackground : 'transparent',
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
