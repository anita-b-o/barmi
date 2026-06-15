import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StoreReadiness } from '@/api/contracts/v1/storeAdmin'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import { StoreReadinessChecklist } from './StoreReadinessChecklist'

export default function AdminStoreOnboardingScreen() {
  const { me, logout, authRequest } = useAuth()
  const [readiness, setReadiness] = useState<StoreReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadReadiness = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await storeAdminAdapter.getStoreReadiness(authRequest)
        if (!cancelled) setReadiness(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el estado para publicar tu tienda.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadReadiness()
    return () => {
      cancelled = true
    }
  }, [authRequest])

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Publicar tu tienda' }]} />
      <PageHeader
        title="Publicar tu tienda"
        eyebrow="Primeros pasos"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge={readiness?.publishReady ? 'Lista' : 'Pendiente'}
        title={readiness?.publishReady ? 'Tu tienda ya tiene lo básico para salir al público' : 'Completá lo mínimo para publicar con confianza'}
        description="Una lista corta con acciones concretas. Cada botón te lleva a la pantalla existente donde se completa ese paso."
        tone="store"
      />

      <Section
        title="Tienda lista para publicar"
        action={(
          <Link to={routes.adminStore} style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Volver al Hub Store</Button>
          </Link>
        )}
      >
        <Card>
          {loading ? <LoadingState label="Revisando tu tienda..." /> : null}
          {error ? <ErrorState message={error} /> : null}
          {readiness ? <StoreReadinessChecklist readiness={readiness} /> : null}
        </Card>
      </Section>
    </AdminLayout>
  )
}
