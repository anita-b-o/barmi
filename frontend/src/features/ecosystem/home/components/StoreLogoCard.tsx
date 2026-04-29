import { Link } from 'react-router-dom'

type StoreLogoCardProps = {
  name: string
  href: string
  logoUrl?: string | null
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function StoreLogoCard({ name, href, logoUrl }: StoreLogoCardProps) {
  return (
    <Link className="ecosystem-store-rails__logo-link" to={href} aria-label={`Ir a la tienda ${name}`}>
      {logoUrl ? (
        <img className="ecosystem-store-rails__logo-image" src={logoUrl} alt={`Logo de ${name}`} />
      ) : (
        <span className="ecosystem-store-rails__logo-fallback" aria-label={`Logo de ${name}`}>
          {initials(name)}
        </span>
      )}
    </Link>
  )
}
