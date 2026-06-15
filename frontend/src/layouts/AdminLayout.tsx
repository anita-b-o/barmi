import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { routes } from '@/core/constants/routes'
import { ThemeToggle, theme } from '@/app/theme'
import { useAuth } from '@/core/auth'
import { hasActiveEcosystemMembership, hasActiveStoreMembership } from '@/core/auth/routeGuards'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import Sidebar from '@/components/navigation/Sidebar'
import Topbar from '@/components/navigation/Topbar'
import { BetaFeedbackWidget } from '@/features/beta'

type AdminScope = 'home' | 'platform' | 'store' | 'ecosystem'

function resolveScope(pathname: string): AdminScope {
  if (pathname.startsWith('/admin/saas')) return 'platform'
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
    { to: routes.adminStoreOnboarding, label: 'Publicar tienda' },
    { to: routes.adminOrders, label: 'Órdenes' },
    { to: routes.adminFulfillments, label: 'Fulfillments' },
    { to: routes.adminMembers, label: 'Miembros' },
    { to: routes.adminStoreModules, label: 'Partes de tu tienda' },
    { to: routes.adminStoreProducts, label: 'Productos' },
    { to: routes.adminStorePromotions, label: 'Promociones' },
    { to: routes.adminShippingZones, label: 'Envíos' }
  ]
  const ecosystemLinks = [
    { to: routes.adminEcosystem, label: 'Hub ecosystem', end: true },
    { to: routes.adminEcosystemOrders, label: 'Órdenes' },
    { to: routes.adminEcosystemFulfillments, label: 'Fulfillments' },
    { to: routes.adminEcosystemProducts, label: 'Productos' },
    { to: routes.adminEcosystemPromotions, label: 'Promociones' },
    { to: routes.adminEcosystemShipping, label: 'Shipping zones' }
  ]
  const platformLinks = [
    { to: routes.adminSaas, label: 'Planes SaaS', end: true }
  ]
  const scopedLinks = scope === 'ecosystem' ? ecosystemLinks : scope === 'store' ? storeLinks : scope === 'platform' ? platformLinks : []
  const contextLabel = scope === 'ecosystem' ? 'Dominio activo: Ecosystem' : scope === 'store' ? 'Dominio activo: Store' : scope === 'platform' ? 'Administración platform' : 'Elegí un dominio operativo'
  const navStyle: React.CSSProperties = {
    display: 'grid',
    gap: 10
  }

  return (
    <div className="barmi-admin-shell" style={{ minHeight: '100vh', background: theme.colors.bgPage, color: theme.colors.textPrimary }}>
      <style>
        {`
          .barmi-admin-shell {
            --admin-bg-page: var(--barmi-color-bg-page);
            --admin-bg-surface: var(--barmi-color-bg-surface);
            --admin-bg-surface-alt: var(--barmi-color-bg-surface-alt);
            --admin-bg-hover: var(--barmi-color-bg-hover);
            --admin-text-primary: var(--barmi-color-text-primary);
            --admin-text-secondary: var(--barmi-color-text-secondary);
            --admin-text-muted: var(--barmi-color-text-muted);
            --admin-border-default: var(--barmi-color-border-default);
            --admin-border-strong: var(--barmi-color-border-strong);
            --admin-action-primary: var(--barmi-color-action-primary);
            --admin-action-hover: var(--barmi-color-action-hover);
            --admin-focus-ring: var(--barmi-focus-ring);
          }

          .barmi-admin-nav-link {
            color: var(--admin-text-secondary);
            text-decoration: none;
            padding: 10px 12px;
            border-radius: var(--barmi-radius-md);
            background: transparent;
            border: 1px solid transparent;
            font-weight: 500;
            transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
          }

          .barmi-admin-nav-link:hover {
            color: var(--admin-text-primary);
            background: var(--admin-bg-hover);
            border-color: var(--admin-border-default);
          }

          .barmi-admin-nav-link[aria-current="page"] {
            color: var(--admin-text-primary);
            background: var(--admin-bg-surface);
            border-color: var(--admin-border-strong);
            font-weight: 700;
          }

          .barmi-admin-shell a:focus-visible,
          .barmi-admin-shell button:focus-visible {
            outline: 3px solid var(--admin-focus-ring);
            outline-offset: 2px;
          }
        `}
      </style>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', minHeight: '100vh' }}>
        <Sidebar
          style={isMobile ? {
            borderRight: 'none',
            borderBottom: `1px solid ${theme.colors.borderDefault}`,
            padding: `${theme.spacing.lg}px`,
          } : undefined}
        >
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: theme.spacing.xs, color: theme.colors.textPrimary, letterSpacing: 0 }}>Barmi Admin</div>
          <div style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.xl }}>{contextLabel}</div>

          <div style={{ marginBottom: theme.spacing.xl }}>
            <div style={sectionTitleStyle}>Entrada</div>
            <nav style={navStyle}>
              <NavLink to={routes.adminHome} end className="barmi-admin-nav-link">Selección de dominios</NavLink>
            </nav>
          </div>

          <div style={{ marginBottom: theme.spacing.xl }}>
            <div style={sectionTitleStyle}>Dominios</div>
            <nav style={navStyle}>
              <NavLink to={routes.adminSaas} className="barmi-admin-nav-link">Admin SaaS</NavLink>
              {hasStore ? <NavLink to={routes.adminStore} className="barmi-admin-nav-link">Admin Store</NavLink> : null}
              {hasEcosystem ? <NavLink to={routes.adminEcosystem} className="barmi-admin-nav-link">Admin Ecosystem</NavLink> : null}
            </nav>
          </div>

          {scopedLinks.length > 0 ? (
            <div>
              <div style={sectionTitleStyle}>Navegación</div>
              <nav style={navStyle}>
                {scopedLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} end={link.end} className="barmi-admin-nav-link">{link.label}</NavLink>
                ))}
              </nav>
            </div>
          ) : null}
        </Sidebar>
        <div>
          <Topbar
            title="Barmi Platform"
            eyebrow={scope === 'home' ? 'Backoffice' : scope === 'store' ? 'Store admin' : scope === 'ecosystem' ? 'Ecosystem admin' : 'SaaS admin'}
            subtitle={scope === 'home' ? 'Consola operativa' : scope === 'store' ? 'Contexto STORE activo' : scope === 'ecosystem' ? 'Contexto ECOSYSTEM activo' : 'Planes y suscripciones'}
            tone={scope === 'store' ? 'store' : scope === 'ecosystem' ? 'ecosystem' : 'admin'}
            actions={(
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                <div style={{ color: theme.colors.textMuted, fontWeight: 500, textAlign: isMobile ? 'left' : 'right' }}>
                  {scope === 'home' ? 'Elegí el dominio desde el que vas a operar.' : scope === 'platform' ? 'Administración SaaS global.' : `Navegación contextual para ${scope === 'store' ? 'STORE' : 'ECOSYSTEM'}.`}
                </div>
                <ThemeToggle />
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
