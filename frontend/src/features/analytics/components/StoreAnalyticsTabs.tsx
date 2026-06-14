import { NavLink } from 'react-router-dom'
import { alpha, theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'

const tabs = [
  { label: 'Producto', to: routes.adminStoreAnalytics, end: true },
  { label: 'Ventas', to: routes.adminStoreCommerceAnalytics, end: true },
  { label: 'Funnel', to: routes.adminStoreFunnelAnalytics, end: true }
]

export default function StoreAnalyticsTabs() {
  return (
    <nav
      aria-label="Navegación de Analytics"
      style={{
        display: 'flex',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
        marginBottom: theme.spacing.xl,
        borderBottom: `1px solid ${theme.colors.borderDefault}`
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 40,
            padding: '0 12px',
            marginBottom: -1,
            color: isActive ? theme.colors.textPrimary : theme.colors.textMuted,
            textDecoration: 'none',
            fontSize: theme.typography.label.size,
            fontWeight: isActive ? 700 : 600,
            borderBottom: `2px solid ${isActive ? theme.colors.actionPrimary : 'transparent'}`,
            background: isActive ? alpha(theme.colors.actionPrimary, 0.08) : 'transparent',
            borderTopLeftRadius: theme.radius.sm,
            borderTopRightRadius: theme.radius.sm
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
