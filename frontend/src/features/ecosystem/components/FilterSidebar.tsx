import type { ReactNode } from 'react'
import { SurfaceCard } from './SurfaceCard'

type FilterSidebarProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function FilterSidebar({ title, description, children, footer }: FilterSidebarProps) {
  return (
    <SurfaceCard variant="panel" className="ecosystem-filter-sidebar" style={{ height: '100%' }}>
      <div className="ecosystem-filter-sidebar__header">
        <h2 className="ecosystem-filter-sidebar__title">{title}</h2>
        <p className="ecosystem-filter-sidebar__description">{description}</p>
      </div>

      <div className="ecosystem-filter-sidebar__content">{children}</div>

      {footer ? <div>{footer}</div> : <div />}
    </SurfaceCard>
  )
}
