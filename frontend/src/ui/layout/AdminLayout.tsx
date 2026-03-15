import React from 'react'
import { NavLink } from 'react-router-dom'
import { routes } from '../../core/constants/routes'
import { theme } from '../theme/theme'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? theme.colors.primary : theme.colors.text,
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: theme.radius.md,
    background: isActive ? theme.colors.primarySoft : 'transparent',
    fontWeight: isActive ? 600 : 500
  })

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background, color: theme.colors.text }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
        <aside style={{ padding: theme.spacing.xl, borderRight: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: theme.spacing.sm, color: theme.colors.text }}>Barmi Admin</div>
          <div style={{ color: theme.colors.textMuted, marginBottom: theme.spacing.xl }}>Marketplace operations</div>
          <nav style={{ display: 'grid', gap: 10 }}>
            <NavLink to={routes.adminHome} end style={navLinkStyle}>Dashboard</NavLink>
            <NavLink to={routes.adminOrders} style={navLinkStyle}>Órdenes</NavLink>
            <NavLink to={routes.adminStore} style={navLinkStyle}>Store</NavLink>
            <NavLink to={routes.adminEcosystem} style={navLinkStyle}>Ecosystem</NavLink>
            <NavLink to={routes.adminEcosystemProducts} style={navLinkStyle}>Ecosystem Products</NavLink>
            <NavLink to={routes.adminEcosystemShipping} style={navLinkStyle}>Ecosystem Shipping</NavLink>
          </nav>
        </aside>
        <div>
          <div style={{ padding: theme.spacing.xl, borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}>
            <div style={{ color: theme.colors.textMuted, fontWeight: 500 }}>Barmi Platform</div>
          </div>
          <main style={{ padding: theme.spacing.xxl }}>{children}</main>
        </div>
      </div>
    </div>
  )
}
