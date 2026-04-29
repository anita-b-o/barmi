import { FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth'
import { BrandSection } from './BrandSection'
import { MobileTopbarActions } from './MobileTopbarActions'
import { NavLinks } from './NavLinks'
import { SearchBar } from './SearchBar'
import { TopbarActions } from './TopbarActions'
import {
  ecosystemGuestActions,
  ecosystemNavItems,
  getEcosystemMemberActions
} from './config'
import './EcosystemTopbar.css'

type EcosystemTopbarProps = {
  cartCount: number
}

function splitHref(href: string) {
  const [pathname, hash] = href.split('#')
  return {
    pathname: pathname || '',
    hash: hash ? `#${hash}` : ''
  }
}

export default function EcosystemTopbar({ cartCount }: EcosystemTopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, me, loading } = useAuth()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const accountLabel = useMemo(() => {
    if (!me?.email) return 'Mi cuenta'
    return me.email.split('@')[0]
  }, [me?.email])

  const actionItems = useMemo(() => {
    if (loading) return []
    return isAuthenticated ? getEcosystemMemberActions(accountLabel) : ecosystemGuestActions
  }, [accountLabel, isAuthenticated, loading])

  const isLinkActive = (href: string) => {
    const { pathname, hash } = splitHref(href)

    if (hash) {
      return location.pathname === (pathname || location.pathname) && location.hash === hash
    }

    if (!pathname) return false
    if (pathname === routes.ecosystemHome) return location.pathname === pathname
    return location.pathname === pathname || location.pathname.startsWith(`${pathname}/`)
  }

  const closeMenu = () => setMenuOpen(false)

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = query.trim()
    navigate(normalized ? `${routes.ecosystemCatalog}?q=${encodeURIComponent(normalized)}` : routes.ecosystemCatalog)
    closeMenu()
  }

  const goToSearch = () => {
    navigate(routes.ecosystemCatalog)
    closeMenu()
  }

  return (
    <header className="ecosystem-topbar">
      <div className="ecosystem-topbar__inner">
        <BrandSection onNavigate={closeMenu} />

        <div className="ecosystem-topbar__desktop-center">
          <SearchBar query={query} onQueryChange={setQuery} onSubmit={handleSearchSubmit} />
          <NavLinks items={ecosystemNavItems} isActive={isLinkActive} />
        </div>

        <TopbarActions actions={actionItems} cartCount={cartCount} checkoutHref={routes.ecosystemCheckout} />

        <MobileTopbarActions menuOpen={menuOpen} onSearch={goToSearch} onToggleMenu={() => setMenuOpen((current) => !current)} />
      </div>

      {menuOpen ? (
        <div className="ecosystem-topbar__mobile-menu" id="ecosystem-topbar-mobile-menu">
          <NavLinks items={ecosystemNavItems} isActive={isLinkActive} onNavigate={closeMenu} />
          <div className="ecosystem-topbar__mobile-menu-actions">
            {actionItems.map((action) => (
              <Link key={action.kind} className="ecosystem-topbar__mobile-menu-link" to={action.href} onClick={closeMenu}>
                {action.label}
              </Link>
            ))}
            <Link className="ecosystem-topbar__mobile-menu-link" to={routes.ecosystemCheckout} onClick={closeMenu}>
              Carrito{cartCount > 0 ? ` (${cartCount})` : ''}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
