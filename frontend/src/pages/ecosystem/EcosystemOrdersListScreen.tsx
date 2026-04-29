import { Link, useSearchParams } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import { Breadcrumbs } from '@/components/navigation'
import Button from '@/components/primitives/Button'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemSurfaceSection } from '@/features/ecosystem'
import {
  EcosystemOrdersFilters,
  EcosystemOrdersTable,
  useEcosystemOrdersList
} from '@/features/ecosystem'

export default function EcosystemOrdersScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? '0') || 0
  const status = searchParams.get('status') ?? ''
  const orders = useEcosystemOrdersList(page, status)

  return (
    <EcosystemLayout>
      <Breadcrumbs items={[{ label: 'Ecosystem', href: routes.ecosystemHome }, { label: 'Órdenes' }]} />
      <div style={{ display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}>
        <EcosystemHeroSection
          eyebrow="Seguimiento ecosystem"
          title="Órdenes Ecosystem"
          description="Entrá al detalle cuando necesites reintentar un pago, validar el estado final o revisar lo que ya quedó consolidado."
          badges={(
            <>
              <EcosystemHeroBadge>Historial público</EcosystemHeroBadge>
              {status ? <EcosystemHeroBadge variant="info">Estado: {status}</EcosystemHeroBadge> : null}
            </>
          )}
          actions={(
            <>
              <Button variant="secondary" onClick={() => setSearchParams(new URLSearchParams())}>
                Limpiar filtros
              </Button>
              <Link to={routes.ecosystemCatalog} style={{ textDecoration: 'none' }}>
                <Button variant="ghost">Volver al catálogo</Button>
              </Link>
            </>
          )}
          aside={(
            <>
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                Usá el detalle para seguir pagos pendientes y volver al flujo exacto cuando haga falta.
              </div>
              <EcosystemOrdersFilters
                status={status}
                onStatusChange={(nextStatus) => {
                  const next = new URLSearchParams(searchParams)
                  if (nextStatus) {
                    next.set('status', nextStatus)
                  } else {
                    next.delete('status')
                  }
                  next.set('page', '0')
                  setSearchParams(next)
                }}
              />
            </>
          )}
        />

        {orders.error && (
          <EcosystemSurfaceSection>
            <ErrorState message={orders.error} />
          </EcosystemSurfaceSection>
        )}

        {orders.isLoading ? (
          <EcosystemSurfaceSection>
            <LoadingState label="Cargando órdenes del ecosystem..." />
          </EcosystemSurfaceSection>
        ) : !orders.data || orders.data.content.length === 0 ? (
          <EcosystemSurfaceSection>
            <EmptyState
              title="No hay órdenes ecosystem"
              description={status ? 'Probá quitando el filtro por estado.' : 'Todavía no hay órdenes creadas para mostrar.'}
            />
          </EcosystemSurfaceSection>
        ) : (
          <EcosystemSurfaceSection tone="warm">
            <EcosystemOrdersTable
              data={orders.data}
              onPageChange={(nextPage) => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(nextPage))
                setSearchParams(next)
              }}
            />
          </EcosystemSurfaceSection>
        )}
      </div>
    </EcosystemLayout>
  )
}
