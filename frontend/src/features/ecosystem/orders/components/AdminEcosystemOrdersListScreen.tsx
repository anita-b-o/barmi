import { Link, useSearchParams } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import PageHeader from '@/components/navigation/SectionHeader'
import Button from '@/components/primitives/Button'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { useAuth } from '@/core/auth'
import { routes } from '@/core/constants/routes'
import { theme } from '@/app/theme'
import { useEcosystemOrdersList } from '../hooks/useEcosystemOrdersList'
import { EcosystemOrdersFilters } from './EcosystemOrdersFilters'
import { EcosystemOrdersTable } from './EcosystemOrdersTable'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import Card from '@/components/primitives/Card'
import { formatDate } from '@/core/utils/format'

export default function AdminEcosystemOrdersListScreen() {
  const { me, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? '0') || 0
  const ecosystemId = searchParams.get('ecosystemId') ?? undefined
  const status = searchParams.get('status') ?? ''
  const createdFrom = searchParams.get('createdFrom') ?? undefined
  const createdTo = searchParams.get('createdTo') ?? undefined
  const paidFrom = searchParams.get('paidFrom') ?? undefined
  const paidTo = searchParams.get('paidTo') ?? undefined
  const drilldownMetric = searchParams.get('drilldownMetric')
  const rangeLabel = searchParams.get('rangeLabel')
  const drilldownLabel = ({
    ordersCreated: 'Órdenes creadas',
    paymentsConfirmed: 'Pagos confirmados'
  } as Record<string, string>)[drilldownMetric ?? ''] ?? drilldownMetric
  const orders = useEcosystemOrdersList(page, status, {
    retry: false,
    ecosystemId,
    createdFrom,
    createdTo,
    paidFrom,
    paidTo
  })

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Ecosystem', href: routes.adminEcosystem }, { label: 'Órdenes' }]} />
      <PageHeader
        title="Órdenes Ecosystem"
        eyebrow="Ecosystem admin"
        tone="ecosystem"
        subtitle={me?.email}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void orders.refetch()} disabled={orders.isFetching}>
              {orders.isFetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Link to={routes.adminEcosystem} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver al hub
            </Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      <ContextHeader
        badge="Operación ECOSYSTEM"
        title="Listado de órdenes del ecosystem"
        description="Filtrá por estado y pasá al detalle cuando necesites resolver pago o validar el estado final."
        tone="ecosystem"
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

      {drilldownMetric || createdFrom || paidFrom ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <Card variant="soft">
            <div style={{ display: 'grid', gap: theme.spacing.sm }}>
              <strong style={{ color: theme.colors.secondary }}>Drill-down operativo activo</strong>
              <div style={{ color: theme.colors.textMuted }}>
                {drilldownLabel ?? 'Filtro temporal aplicado'}{rangeLabel ? ` · ${rangeLabel}` : ''}
              </div>
              <div style={{ color: theme.colors.textMuted }}>
                {createdFrom ? `Creación desde ${formatDate(createdFrom)}` : null}
                {createdFrom && createdTo ? ' · ' : null}
                {createdTo ? `hasta ${formatDate(createdTo)}` : null}
                {paidFrom ? `${createdFrom || createdTo ? ' · ' : ''}Pago confirmado desde ${formatDate(paidFrom)}` : null}
                {paidFrom && paidTo ? ' · ' : null}
                {paidTo ? `hasta ${formatDate(paidTo)}` : null}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {orders.error ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <ErrorAlert
            message={orders.error}
            actionLabel="Reintentar"
            onAction={() => void orders.refetch()}
            actionDisabled={orders.isFetching}
          />
        </div>
      ) : null}

      {orders.isLoading ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <LoadingBlock label="Cargando órdenes ecosystem..." />
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
            getDetailPath={routes.adminEcosystemOrderDetail}
            onPageChange={(nextPage) => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(nextPage))
              setSearchParams(next)
            }}
          />
        </div>
      )}
    </AdminLayout>
  )
}
