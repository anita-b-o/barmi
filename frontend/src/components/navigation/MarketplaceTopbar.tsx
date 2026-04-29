import { FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { useAuth } from '@/core/auth'
import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'

type MarketplaceTopbarProps = {
  cartCount: number
}

function splitHref(href: string) {
  const [pathname, hash] = href.split('#')
  return {
    pathname: pathname || '',
    hash: hash ? `#${hash}` : ''
  }
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4H5L7.2 14.2C7.3 14.7 7.8 15 8.3 15H17.8C18.3 15 18.7 14.7 18.8 14.2L20.4 7.5H6.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19" r="1.4" fill="currentColor" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4 17H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function IconButton({
  label,
  onClick,
  children,
  count,
  active = false,
  expanded,
  chrome = true
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  count?: number
  active?: boolean
  expanded?: boolean
  chrome?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: 40,
        height: 40,
        borderRadius: theme.radius.md,
        border: chrome ? `1px solid ${active || isHovered ? theme.colors.borderStrong : theme.colors.borderDefault}` : 'none',
        background: chrome ? theme.colors.bgSurfaceAlt : 'transparent',
        color: theme.colors.textPrimary,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'none',
        boxShadow: 'none',
        padding: 10
      }}
    >
      {children}
        {count && count > 0 ? (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: theme.radius.pill,
            background: theme.colors.bgSurfaceAlt,
            color: theme.colors.textPrimary,
            border: `1px solid ${theme.colors.borderDefault}`,
            fontSize: 10,
            fontWeight: 700,
            lineHeight: '16px',
            textAlign: 'center',
            boxShadow: 'none'
          }}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

function TopbarNavLink({
  href,
  label,
  active,
  onNavigate
}: {
  href: string
  label: string
  active: boolean
  onNavigate?: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      to={href}
      onClick={onNavigate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        textDecoration: 'none',
        color: active || isHovered ? theme.colors.textPrimary : theme.colors.textSecondary,
        fontWeight: active ? 700 : 500,
        fontSize: 9,
        padding: '2px 0',
        borderBottom: `1px solid ${active || isHovered ? theme.colors.borderStrong : 'transparent'}`,
        transition: 'none'
      }}
    >
      {label}
    </Link>
  )
}

export default function MarketplaceTopbar({ cartCount }: MarketplaceTopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const viewportMode = useViewportMode()
  const { isAuthenticated, me, loading } = useAuth()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = viewportMode === 'mobile'
  const accountLabel = useMemo(() => {
    if (!me?.email) return 'Mi cuenta'
    return me.email.split('@')[0]
  }, [me?.email])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = query.trim()
    navigate(normalized ? `${routes.ecosystemCatalog}?q=${encodeURIComponent(normalized)}` : routes.ecosystemCatalog)
    setMenuOpen(false)
  }

  const goToSearch = () => {
    navigate(routes.ecosystemCatalog)
    setMenuOpen(false)
  }

  const utilityLinks = [
    { label: 'Mapa', href: routes.ecosystemStoresMap },
    { label: 'Tiendas', href: `${routes.ecosystemHome}#home-section-stores-featured` },
    { label: 'Productos', href: routes.ecosystemCatalog },
    { label: 'Categorias', href: routes.ecosystemStoresMap }
  ]

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
    const currentPath = location.pathname
    const currentHash = location.hash

    if (hash) {
      return currentPath === (pathname || currentPath) && currentHash === hash
    }

    if (!pathname) return false
    if (pathname === routes.ecosystemHome) return currentPath === pathname
    return currentPath === pathname || currentPath.startsWith(`${pathname}/`)
  }

  const desktopContentWidth = 980
  const desktopLogoColumnWidth = 92
  const desktopCenterColumnWidth = 440

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        borderBottom: `1px solid ${theme.colors.borderDefault}`,
        background: theme.colors.bgSurfaceAlt,
        backdropFilter: 'none',
        boxShadow: 'none'
      }}
    >
      <div style={{ maxWidth: desktopContentWidth, margin: '0 auto', padding: `6px 18px 4px` }}>
        {isMobile ? (
          <div style={{ display: 'grid', gap: theme.spacing.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.sm, alignItems: 'center' }}>
              <Link
                to={routes.ecosystemHome}
                style={{ textDecoration: 'none', color: theme.colors.secondary, minWidth: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: theme.spacing.sm }}>
                  <div style={{ fontWeight: 700, color: theme.colors.textPrimary }}>
                    Barmi
                  </div>
                </div>
              </Link>
              <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
                <IconButton label="Buscar" onClick={goToSearch} chrome={false}>
                  <SearchIcon />
                </IconButton>
                <IconButton label="Carrito" onClick={() => navigate(routes.ecosystemCheckout)} count={cartCount} active={cartCount > 0} chrome={false}>
                  <CartIcon />
                </IconButton>
                <IconButton label="Menú" onClick={() => setMenuOpen((current) => !current)} expanded={menuOpen} chrome={false}>
                  <MenuIcon />
                </IconButton>
              </div>
            </div>

            {menuOpen ? (
              <div
                style={{
                  display: 'grid',
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.borderDefault}`,
                  background: theme.colors.bgSurfaceAlt,
                  boxShadow: 'none'
                }}
              >
                <div style={{ display: 'grid', gap: theme.spacing.xs }}>
                  <div style={{ fontWeight: 700, color: theme.colors.textPrimary }}>
                    {isAuthenticated ? `Hola, ${accountLabel}` : 'Acceso a tu cuenta'}
                  </div>
                  <div style={{ color: theme.colors.textSecondary }}>
                    Navegacion publica del ecosystem, carrito externo y accesos utiles del marketplace.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  {accountLinks.map((item) => (
                    <Link key={item.label} to={item.href} style={{ textDecoration: 'none' }}>
                      <Button variant={item.label === 'Creá tu cuenta' ? 'primary' : 'secondary'}>{item.label}</Button>
                    </Link>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                  <TopbarNavLink href={routes.ecosystemCatalog} label="Buscar" active={isLinkActive(routes.ecosystemCatalog)} onNavigate={() => setMenuOpen(false)} />
                  {utilityLinks.map((item) => (
                    <TopbarNavLink key={item.label} href={item.href} label={item.label} active={isLinkActive(item.href)} onNavigate={() => setMenuOpen(false)} />
                  ))}
                  <TopbarNavLink href={routes.ecosystemCheckout} label="Checkout" active={isLinkActive(routes.ecosystemCheckout)} onNavigate={() => setMenuOpen(false)} />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
            <div style={{ display: 'grid' }}>
              <div
                style={{
                  display: 'grid',
                  columnGap: 18,
                  gridTemplateColumns: `${desktopLogoColumnWidth}px minmax(0, ${desktopCenterColumnWidth}px) max-content`,
                  alignItems: 'start'
                }}
              >
                <Link
                  to={routes.ecosystemHome}
                  style={{
                    textDecoration: 'none',
                    color: theme.colors.secondary,
                    width: desktopLogoColumnWidth,
                    display: 'grid',
                    justifyItems: 'start',
                    alignContent: 'start',
                    paddingTop: 2
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      justifyItems: 'start',
                      minWidth: 0,
                      gap: 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 16, color: theme.colors.textPrimary }}>
                      Barmi
                    </div>
                  </div>
                </Link>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: '30px auto',
                    rowGap: 6,
                    alignContent: 'start',
                    width: '100%'
                  }}
                >
                  <form
                    onSubmit={handleSearch}
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      alignItems: 'stretch',
                      borderRadius: 0,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      background: theme.colors.bgSurfaceAlt,
                      boxShadow: 'none',
                      width: desktopCenterColumnWidth
                    }}
                  >
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscá tiendas, productos y demás"
                      aria-label="Buscar en marketplace"
                      style={{
                        minHeight: 30,
                        border: 'none',
                        borderRadius: 0,
                        boxShadow: 'none',
                        background: 'transparent',
                        color: theme.colors.textPrimary,
                        paddingLeft: 11,
                        paddingRight: 35,
                        fontSize: 10
                      }}
                    />
                    <button
                      type="submit"
                      aria-label="Buscar"
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        minHeight: 30,
                        width: 35,
                        border: 'none',
                        borderRadius: 0,
                        background: theme.colors.bgSurfaceAlt,
                        color: theme.colors.textPrimary,
                        borderLeft: `1px solid ${theme.colors.borderDefault}`
                      }}
                    >
                      <div style={{ transform: 'scale(0.76)', display: 'grid', placeItems: 'center' }}>
                        <SearchIcon />
                      </div>
                    </button>
                  </form>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      gap: 12,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      minHeight: 8,
                      paddingLeft: 1
                    }}
                  >
                    {utilityLinks.map((item) => (
                      <TopbarNavLink key={item.label} href={item.href} label={item.label} active={isLinkActive(item.href)} />
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingTop: 6,
                    minWidth: 0
                  }}
                >
                  {accountLinks.map((item) => (
                    <Link key={item.label} to={item.href} style={{ textDecoration: 'none' }}>
                      <Button
                        variant="ghost"
                        style={{
                          padding: 0,
                          background: 'transparent',
                          color: theme.colors.textPrimary,
                          fontWeight: 500,
                          minHeight: 'auto',
                          fontSize: 10,
                          borderRadius: 0
                        }}
                      >
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                  <IconButton label="Carrito" onClick={() => navigate(routes.ecosystemCheckout)} count={cartCount} active={false} chrome={false}>
                    <CartIcon />
                  </IconButton>
                </div>
              </div>
            </div>
        )}
      </div>
    </header>
  )
}
