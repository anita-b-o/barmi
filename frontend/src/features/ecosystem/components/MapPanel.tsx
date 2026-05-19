import type { ReactNode } from 'react'
import { SurfaceCard } from './SurfaceCard'

type MapPanelProps = {
  title: string
  subtitle: string
  meta?: ReactNode
  children: ReactNode
}

export function MapPanel({ title, subtitle, meta, children }: MapPanelProps) {
  return (
    <SurfaceCard variant="panel" className="ecosystem-map-panel" style={{ padding: 12 }}>
      <div className="ecosystem-map-panel__header">
        <div className="ecosystem-stack" style={{ gap: 4 }}>
          <h2 className="ecosystem-map-panel__title">{title}</h2>
          <p className="ecosystem-map-panel__subtitle">{subtitle}</p>
        </div>
        {meta}
      </div>
      <div className="ecosystem-map-panel__viewport">{children}</div>
    </SurfaceCard>
  )
}
