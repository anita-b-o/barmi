import type { ReactNode } from 'react'
import { theme } from '@/app/theme'

type StoresMapLayoutProps = {
  isMobile: boolean
  sidebar: ReactNode
  map: ReactNode
}

export function StoresMapLayout({ isMobile, sidebar, map }: StoresMapLayoutProps) {
  if (isMobile) {
    return (
      <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {map}
        {sidebar}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: theme.spacing.xl,
        gridTemplateColumns: 'minmax(320px, 360px) minmax(0, 1fr)',
        alignItems: 'start'
      }}
    >
      {sidebar}
      {map}
    </div>
  )
}
