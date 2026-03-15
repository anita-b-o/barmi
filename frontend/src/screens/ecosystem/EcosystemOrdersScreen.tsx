import { Link, useSearchParams } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '../../app/theme'
import { routes } from '../../core/constants/routes'
import { PageHeader } from '../../design-system/patterns'
import { EmptyState, ErrorAlert, LoadingBlock } from '../../design-system/components'
import {
  EcosystemOrdersFilters,
  EcosystemOrdersTable,
  useEcosystemOrdersList
} from '../../modules/ecosystem'

export default function EcosystemOrdersScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? '0') || 0
  const status = searchParams.get('status') ?? ''
  const orders = useEcosystemOrdersList(page, status)

  return (
    <EcosystemLayout>
      <PageHeader
        title="Órdenes Ecosystem"
        subtitle="Usá el detalle para seguir órdenes pendientes de pago o revisar órdenes ya cerradas."
        actions={<Link to={routes.ecosystemCatalog} style={{ color: theme.colors.primary, textDecoration: 'none' }}>Volver al catálogo</Link>}
      />

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

      {orders.error && (
        <div style={{ marginTop: theme.spacing.xl }}>
          <ErrorAlert message={orders.error} />
        </div>
      )}

      {orders.isLoading ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <LoadingBlock label="Cargando órdenes del ecosystem..." />
        </div>
      ) : !orders.data || orders.data.content.length === 0 ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <EmptyState
            title="No hay órdenes ecosystem"
            description={status ? 'Probá quitando el filtro por estado.' : 'Todavía no hay órdenes creadas para mostrar.'}
          />
        </div>
      ) : (
        <div style={{ marginTop: theme.spacing.xl }}>
          <EcosystemOrdersTable
            data={orders.data}
            onPageChange={(nextPage) => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(nextPage))
              setSearchParams(next)
            }}
          />
        </div>
      )}
    </EcosystemLayout>
  )
}
