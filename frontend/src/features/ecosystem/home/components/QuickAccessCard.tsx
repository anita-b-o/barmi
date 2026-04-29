import { Link } from 'react-router-dom'
import type { QuickAccessItem } from '../config'
import { QuickAccessIconGraphic } from './QuickAccessIcons'

type QuickAccessCardProps = {
  item: QuickAccessItem
}

export function QuickAccessCard({ item }: QuickAccessCardProps) {
  return (
    <Link
      className="ecosystem-home-hero__quick-card"
      data-variant={item.variant}
      to={item.href}
      aria-label={`${item.ctaLabel}: ${item.title}`}
    >
      <span className="ecosystem-home-hero__quick-icon">
        <QuickAccessIconGraphic icon={item.icon} />
      </span>
      <span className="ecosystem-home-hero__quick-content">
        <span className="ecosystem-home-hero__quick-title">{item.title}</span>
        {item.description ? (
          <span className="ecosystem-home-hero__quick-description">{item.description}</span>
        ) : null}
      </span>
      <span className="ecosystem-home-hero__quick-cta">{item.ctaLabel}</span>
    </Link>
  )
}
