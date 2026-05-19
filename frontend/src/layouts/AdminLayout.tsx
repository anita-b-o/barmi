import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { routes } from '@/core/constants/routes'
import { alpha, getContextPalette, theme } from '@/app/theme'
import { useAuth } from '@/core/auth'
import { hasActiveEcosystemMembership, hasActiveStoreMembership } from '@/core/auth/routeGuards'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import Sidebar from '@/components/navigation/Sidebar'
import Topbar from '@/components/navigation/Topbar'
import { BetaFeedbackWidget } from '@/features/beta'

type AdminScope = 'home' | 'store' | 'ecosystem'

function resolveScope(pathname: string): AdminScope {
  if (pathname.startsWith('/admin/ecosystem')) return 'ecosystem'
  if (
    pathname.startsWith('/admin/store') ||
    pathname.startsWith('/admin/orders') ||
    pathname.startsWith('/admin/fulfillments') ||
    pathname.startsWith('/admin/members') ||
    pathname.startsWith('/admin/shipping')
  ) {
    return 'store'
  }
  return 'home'
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { memberships } = useAuth()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const scope = resolveScope(location.pathname)
  const hasStore = hasActiveStoreMembership(memberships)
  const hasEcosystem = hasActiveEcosystemMembership(memberships)
  const palette = getContextPalette(scope === 'store' ? 'store' : scope === 'ecosystem' ? 'ecosystem' : 'admin')
  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? theme.colors.bgSurfaceAlt : theme.colors.textSecondary,
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: theme.radius.md,
    background: isActive ? alpha(palette.accent, 0.22) : 'transparent',
    border: `1px solid ${isActive ? alpha(theme.colors.bgSurfaceAlt, 0.12) : 'transparent'}`,
    fontWeight: isActive ? 600 : 500
  })
  const sectionTitleStyle: React.CSSProperties = {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small.size,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm
  }
  const storeLinks = [
    { to: routes.adminStore, label: 'Hub store', end: true },
    { to: routes.adminOrders, label: 'Órdenes' },
    { to: routes.adminFulfillments, label: 'Fulfillments' },
    { to: routes.adminMembers, label: 'Miembros' },
    { to: routes.adminShippingZones, label: 'Shipping zones' }
  ]
  const ecosystemLinks = [
    { to: routes.adminEcosystem, label: 'Hub ecosystem', end: true },
    { to: routes.adminEcosystemOrders, label: 'Órdenes' },
    { to: routes.adminEcosystemProducts, label: 'Productos' },
    { to: routes.adminEcosystemShipping, label: 'Shipping zones' }
  ]
  const scopedLinks = scope === 'ecosystem' ? ecosystemLinks : scope === 'store' ? storeLinks : []
  const contextLabel = scope === 'ecosystem' ? 'Dominio activo: Ecosystem' : scope === 'store' ? 'Dominio activo: Store' : 'Elegí un dominio operativo'
  const navStyle: React.CSSProperties = {
    display: 'grid',
    gap: 10
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.bgPage, color: theme.colors.textPrimary }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', minHeight: '100vh' }}>
        <Sidebar
          style={isMobile ? {
            borderRight: 'none',
            borderBottom: `1px solid ${theme.colors.borderDefault}`,
            padding: `${theme.spacing.lg}px`,
          } : undefined}
        >
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: theme.spacing.xs, color: theme.colors.bgSurfaceAlt, letterSpacing: 0 }}>Barmi Admin</div>
          <div style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.xl }}>{contextLabel}</div>

          <div style={{ marginBottom: theme.spacing.xl }}>
            <div style={sectionTitleStyle}>Entrada</div>
            <nav style={navStyle}>
              <NavLink to={routes.adminHome} end style={navLinkStyle}>Selección de dominios</NavLink>
            </nav>
          </div>

          <div style={{ marginBottom: theme.spacing.xl }}>
            <div style={sectionTitleStyle}>Dominios</div>
            <nav style={navStyle}>
              {hasStore ? <NavLink to={routes.adminStore} style={navLinkStyle}>Admin Store</NavLink> : null}
              {hasEcosystem ? <NavLink to={routes.adminEcosystem} style={navLinkStyle}>Admin Ecosystem</NavLink> : null}
            </nav>
          </div>

          {scopedLinks.length > 0 ? (
            <div>
              <div style={sectionTitleStyle}>Navegación</div>
              <nav style={navStyle}>
                {scopedLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} end={link.end} style={navLinkStyle}>{link.label}</NavLink>
                ))}
              </nav>
            </div>
          ) : null}
        </Sidebar>
        <div>
          <Topbar
            title="Barmi Platform"
            eyebrow={scope === 'home' ? 'Backoffice' : scope === 'store' ? 'Store admin' : 'Ecosystem admin'}
            subtitle={scope === 'home' ? 'Consola operativa' : scope === 'store' ? 'Contexto STORE activo' : 'Contexto ECOSYSTEM activo'}
            tone={scope === 'store' ? 'store' : scope === 'ecosystem' ? 'ecosystem' : 'admin'}
            actions={(
              <div style={{ color: theme.colors.textMuted, fontWeight: 500, textAlign: isMobile ? 'left' : 'right' }}>
              {scope === 'home' ? 'Elegí el dominio desde el que vas a operar.' : `Navegación contextual para ${scope === 'store' ? 'STORE' : 'ECOSYSTEM'}.`}
              </div>
            )}
          />
          <main style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xxl, maxWidth: 1320 }}>{children}</main>
          <BetaFeedbackWidget />
        </div>
      </div>
    </div>
  )
}
