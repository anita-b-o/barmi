import React from 'react'
import Card from '@/components/primitives/Card'
import { theme } from '@/app/theme'

type SuccessStateProps = {
  title: string
  description?: string
}

export default function SuccessState({ title, description }: SuccessStateProps) {
  return (
    <Card variant="soft" style={{ borderColor: theme.colors.success, background: theme.colors.bgSurfaceAlt }}>
      <div style={{ color: theme.colors.success, fontWeight: 700 }}>{title}</div>
      {description ? <div style={{ marginTop: 8, color: theme.colors.textMuted }}>{description}</div> : null}
    </Card>
  )
}
