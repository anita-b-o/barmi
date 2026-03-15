import React from 'react'
import { theme } from '../theme/theme'

export default function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#FDECEC',
        border: `1px solid ${theme.colors.danger}`,
        color: theme.colors.danger,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        fontSize: theme.typography.body.size,
        boxShadow: theme.shadows.soft
      }}
    >
      {message}
    </div>
  )
}
