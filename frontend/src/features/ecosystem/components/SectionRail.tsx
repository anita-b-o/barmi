import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from './SurfaceCard'

type SectionRailProps = {
  title: string
  titleId: string
  actionHref: string
  actionLabel?: string
  description?: string
  children: ReactNode
  className?: string
}

export function SectionRail({
  title,
  titleId,
  actionHref,
  actionLabel = 'Ver más',
  description,
  children,
  className
}: SectionRailProps) {
  return (
    <SurfaceCard variant="panel" className={['ecosystem-section-rail', className].filter(Boolean).join(' ')}>
      <div className="ecosystem-section-rail__header">
        <div className="ecosystem-section-rail__title-wrap">
          <h2 id={titleId} className="ecosystem-section-rail__title">{title}</h2>
          {description ? <p className="ecosystem-section-rail__description">{description}</p> : null}
        </div>
        <Link className="ecosystem-section-rail__action" to={actionHref}>
          {actionLabel}
        </Link>
      </div>
      {children}
    </SurfaceCard>
  )
}

