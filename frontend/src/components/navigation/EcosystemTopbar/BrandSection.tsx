import { Link } from 'react-router-dom'
import { routes } from '@/core/constants/routes'

type BrandSectionProps = {
  onNavigate?: () => void
}

export function BrandSection({ onNavigate }: BrandSectionProps) {
  return (
    <Link className="ecosystem-topbar__brand" to={routes.ecosystemHome} aria-label="Barmi inicio" onClick={onNavigate}>
      <img className="ecosystem-topbar__brand-icon" src="/barmi-logo.png" alt="" aria-hidden="true" />
      <img className="ecosystem-topbar__brand-wordmark" src="/barmi-wordmark.png" alt="Barmi" />
    </Link>
  )
}
