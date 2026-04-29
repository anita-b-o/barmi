import { Link } from 'react-router-dom'
import type { EcosystemNavItem } from './config'

type NavLinksProps = {
  items: EcosystemNavItem[]
  isActive: (href: string) => boolean
  onNavigate?: () => void
}

export function NavLinks({ items, isActive, onNavigate }: NavLinksProps) {
  return (
    <nav className="ecosystem-topbar__nav" aria-label="Navegación del ecosystem">
      {items.map((item) => (
        <Link
          key={item.label}
          className="ecosystem-topbar__nav-link"
          data-active={isActive(item.href) ? 'true' : undefined}
          to={item.href}
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
