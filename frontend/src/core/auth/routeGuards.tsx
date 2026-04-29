import { Navigate, useLocation } from 'react-router-dom'
import type { AuthMemberships } from '../../api/contracts/v1/auth'
import { AccessDeniedState } from '@/components/navigation'
import { routes } from '../constants/routes'
import { useAuth } from './authContext'

export function hasActiveStoreMembership(memberships: AuthMemberships | null | undefined) {
  return !!memberships?.stores?.some((membership) => membership.status === 'ACTIVE')
}

export function hasActiveEcosystemMembership(memberships: AuthMemberships | null | undefined) {
  return !!memberships?.ecosystems?.some((membership) => membership.status === 'ACTIVE')
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div style={{ padding: 24 }}>Cargando sesión...</div>
  if (!isAuthenticated) return <Navigate to={routes.login} replace state={{ from: location }} />
  return <>{children}</>
}

export function RequireStoreMembership({ children }: { children: React.ReactNode }) {
  const { memberships, loading, me } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Cargando permisos...</div>
  if (!hasActiveStoreMembership(memberships)) {
    const links = hasActiveEcosystemMembership(memberships) ? [{ label: 'Ir a ecosystem', href: routes.adminEcosystem }] : []
    return <AccessDeniedState email={me?.email} userId={me?.userId} backHref={routes.adminHome} links={links} />
  }
  return <>{children}</>
}

export function RequireEcosystemMembership({ children }: { children: React.ReactNode }) {
  const { memberships, loading, me } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Cargando permisos...</div>
  if (!hasActiveEcosystemMembership(memberships)) {
    const links = hasActiveStoreMembership(memberships) ? [{ label: 'Ir a store', href: routes.adminStore }] : []
    return <AccessDeniedState email={me?.email} userId={me?.userId} backHref={routes.adminHome} links={links} />
  }
  return <>{children}</>
}
