import { FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { routes } from '@/core/constants/routes'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { useAuth } from '@/core/auth'
import './MarketplaceTopbar.css'

type MarketplaceTopbarProps = {
  cartCount: number
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L21 21" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4H5L7.2 14.2C7.3 14.7 7.8 15 8.3 15H17.8C18.3 15 18.7 14.7 18.8 14.2L20.4 7.5H6.2" />
      <circle cx="9.5" cy="19" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7H20" />
      <path d="M4 12H20" />
      <path d="M4 17H20" />
    </svg>
  )
}

function splitHref(href: string) {
  const [pathname, hash] = href.split('#')
  return { pathname: pathname || '', hash: hash ? `#${hash}` : '' }
}

const navItems = [
  { label: 'Mapa', href: routes.ecosystemStoresMap },
  { label: 'Tiendas', href: `${routes.ecosystemHome}#home-section-stores-featured` },
  { label: 'Productos', href: routes.ecosystemCatalog },
  { label: 'Categorias', href: routes.ecosystemStoresMap }
]

export default function MarketplaceTopbar({ cartCount }: MarketplaceTopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const viewportMode = useViewportMode()
  const { isAuthenticated, me, loading } = useAuth()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const isCompact = viewportMode !== 'desktop'

  const accountLabel = useMemo(() => {
    if (!me?.email) return 'Mi cuenta'
    return me.email.split('@')[0]
  }, [me?.email])

  const accountLinks = loading
    ? []
    : isAuthenticated
      ? [
          { label: accountLabel, href: routes.adminHome },
          { label: 'Mis compras', href: routes.ecosystemOrders }
        ]
      : [
          { label: 'Creá tu cuenta', href: routes.login },
          { label: 'Mis compras', href: routes.ecosystemOrders }
        ]

  const isLinkActive = (href: string) => {
    const { pathname, hash } = splitHref(href)
    if (hash) return location.pathname === (pathname || location.pathname) && location.hash === hash
    if (!pathname) return false
    if (pathname === routes.ecosystemHome) return location.pathname === pathname
    return location.pathname === pathname || location.pathname.startsWith(`${pathname}/`)
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = query.trim()
    navigate(normalized ? `${routes.ecosystemCatalog}?q=${encodeURIComponent(normalized)}` : routes.ecosystemCatalog)
    setMenuOpen(false)
  }

  const mobileMenu = (
    <div className="marketplace-topbar__mobile-panel" id="marketplace-topbar-mobile-panel">
      <form className="marketplace-topbar__search" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscá tiendas, productos y más..."
          aria-label="Buscar en ecosystem"
        />
        <button type="submit" aria-label="Buscar">
          <SearchIcon />
        </button>
      </form>

      <nav className="marketplace-topbar__mobile-nav" aria-label="Navegación del ecosystem">
        {navItems.map((item) => (
          <Link key={`${item.label}-${item.href}`} className="marketplace-topbar__mobile-link" data-active={isLinkActive(item.href)} to={item.href} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
        {accountLinks.map((item) => (
          <Link key={item.href} className="marketplace-topbar__mobile-link" to={item.href} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )

  return (
    <header className="marketplace-topbar">
      <div className="marketplace-topbar__inner">
        <Link className="marketplace-topbar__brand" to={routes.ecosystemHome} aria-label="Barmi inicio">
          <img className="marketplace-topbar__brand-icon" src="/barmi-logo.png" alt="" aria-hidden="true" />
          <img className="marketplace-topbar__brand-wordmark" src="/barmi-wordmark.png" alt="Barmi" />
        </Link>

        {!isCompact ? (
          <>
            <div className="marketplace-topbar__center">
              <form className="marketplace-topbar__search" onSubmit={handleSearch}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscá tiendas, productos y más..."
                  aria-label="Buscar en ecosystem"
                />
                <button type="submit" aria-label="Buscar">
                  <SearchIcon />
                </button>
              </form>

              <nav className="marketplace-topbar__nav" aria-label="Navegación del ecosystem">
                {navItems.map((item) => (
                  <Link key={`${item.label}-${item.href}`} className="marketplace-topbar__nav-link" data-active={isLinkActive(item.href)} to={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="marketplace-topbar__actions">
              {accountLinks.map((item) => (
                <Link key={item.href} className="marketplace-topbar__action-link" to={item.href}>
                  {item.label}
                </Link>
              ))}
              <Link className="marketplace-topbar__cart" to={routes.ecosystemCheckout} aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} productos` : ''}`}>
                <CartIcon />
                {cartCount > 0 ? <span className="marketplace-topbar__cart-count">{cartCount}</span> : null}
              </Link>
            </div>
          </>
        ) : (
          <div className="marketplace-topbar__mobile-actions">
            <Link className="marketplace-topbar__icon-button" to={routes.ecosystemCheckout} aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} productos` : ''}`}>
              <CartIcon />
              {cartCount > 0 ? <span className="marketplace-topbar__cart-count">{cartCount}</span> : null}
            </Link>
            <button
              className="marketplace-topbar__icon-button"
              type="button"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              aria-controls="marketplace-topbar-mobile-panel"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <MenuIcon />
            </button>
          </div>
        )}
      </div>

      {isCompact && menuOpen ? mobileMenu : null}
    </header>
  )
}
