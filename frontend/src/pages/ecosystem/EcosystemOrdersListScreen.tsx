import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { routes } from '@/core/constants/routes'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import { SurfaceCard } from '@/features/ecosystem/components/SurfaceCard'
import {
  EcosystemOrdersFilters,
  EcosystemOrdersTable,
  useEcosystemOrdersList
} from '@/features/ecosystem'
import '@/features/ecosystem/components/ecosystem-marketplace.css'

export default function EcosystemOrdersScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? '0') || 0
  const status = searchParams.get('status') ?? ''
  const orders = useEcosystemOrdersList(page, status)

  return (
    <EcosystemLayout>
      <main className="ecosystem-orders-page">
        <SurfaceCard variant="inverse" className="ecosystem-orders-page__hero">
          <div className="ecosystem-orders-page__hero-copy">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="info">Órdenes</Badge>
              <Badge variant="success">Seguimiento público</Badge>
              {status ? <Badge variant="warning">Estado: {status}</Badge> : null}
            </div>
            <h1>Órdenes Ecosystem</h1>
            <p>
              Revisá pagos pendientes, confirmaciones y el historial de compras del ecosystem sin pantallas vacías ni bloques de placeholder.
            </p>
          </div>
          <div className="ecosystem-orders-page__hero-actions">
            <Button variant="secondary" onClick={() => setSearchParams(new URLSearchParams())}>
              Limpiar filtros
            </Button>
            <Link to={routes.ecosystemCatalog} style={{ textDecoration: 'none' }}>
              <Button variant="ghost">Volver al catálogo</Button>
            </Link>
          </div>
        </SurfaceCard>

        <div className="ecosystem-orders-page__toolbar">
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
        </div>

        {orders.error && (
          <div className="ecosystem-orders-page__state">
            <ErrorState message={orders.error} />
          </div>
        )}

        {orders.isLoading ? (
          <div className="ecosystem-orders-page__state">
            <LoadingState label="Cargando órdenes del ecosystem..." />
          </div>
        ) : !orders.data || orders.data.content.length === 0 ? (
          <div className="ecosystem-orders-page__state">
            <EmptyState
              title="No hay órdenes ecosystem"
              description={status ? 'Probá quitando el filtro por estado.' : 'Todavía no hay órdenes creadas para mostrar.'}
              actionLabel="Explorar productos"
              onAction={() => navigate(routes.ecosystemCatalog)}
            />
          </div>
        ) : (
          <SurfaceCard variant="panel" className="ecosystem-orders-page__table">
            <EcosystemOrdersTable
              data={orders.data}
              onPageChange={(nextPage) => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(nextPage))
                setSearchParams(next)
              }}
            />
          </SurfaceCard>
        )}
      </main>
    </EcosystemLayout>
  )
}
