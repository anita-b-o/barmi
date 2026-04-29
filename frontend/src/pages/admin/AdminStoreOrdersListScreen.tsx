import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '../../layouts'
import PageHeader from '@/components/navigation/SectionHeader'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { useAuth } from '@/core/auth'
import { theme } from '@/app/theme'
import { useStoreOrdersList, StoreOrdersFilters, StoreOrdersTable } from '@/features/orders'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import { routes } from '@/core/constants/routes'
import { formatDate } from '@/core/utils/format'
import type { StoreDerivedBooleanFilter, StoreOrderStatusFilter } from '@/features/orders'

export default function OrdersListScreen() {
  const { logout, me } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? '0') || 0
  const query = searchParams.get('query') ?? ''
  const status = (searchParams.get('status') ?? 'ALL') as StoreOrderStatusFilter
  const operationalConflict = (searchParams.get('operationalConflict') ?? 'ALL') as StoreDerivedBooleanFilter
  const fulfillment = (searchParams.get('fulfillment') ?? 'ALL') as StoreDerivedBooleanFilter
  const createdFrom = searchParams.get('createdFrom') ?? undefined
  const createdTo = searchParams.get('createdTo') ?? undefined
  const paidFrom = searchParams.get('paidFrom') ?? undefined
  const paidTo = searchParams.get('paidTo') ?? undefined
  const manuallyCancelled = searchParams.get('manuallyCancelled')
  const manualCancelledFrom = searchParams.get('manualCancelledFrom') ?? undefined
  const manualCancelledTo = searchParams.get('manualCancelledTo') ?? undefined
  const hasConflictEvent = searchParams.get('hasConflictEvent')
  const conflictFrom = searchParams.get('conflictFrom') ?? undefined
  const conflictTo = searchParams.get('conflictTo') ?? undefined
  const drilldownMetric = searchParams.get('drilldownMetric')
  const rangeLabel = searchParams.get('rangeLabel')
  const drilldownLabel = ({
    ordersCreated: 'Órdenes creadas',
    paymentsConfirmed: 'Pagos confirmados',
    ordersPaid: 'Órdenes pagadas',
    manualCancellations: 'Cancelaciones manuales',
    stockConflicts: 'Conflictos operativos'
  } as Record<string, string>)[drilldownMetric ?? ''] ?? drilldownMetric
  const orders = useStoreOrdersList({
    page,
    status,
    query,
    operationalConflict,
    fulfillment,
    createdFrom,
    createdTo,
    paidFrom,
    paidTo,
    manuallyCancelled: manuallyCancelled === null ? undefined : manuallyCancelled === 'true',
    manualCancelledFrom,
    manualCancelledTo,
    hasConflictEvent: hasConflictEvent === null ? undefined : hasConflictEvent === 'true',
    conflictFrom,
    conflictTo
  })

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'ALL') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    next.set('page', '0')
    setSearchParams(next)
  }

  const resetFilters = () => {
    const next = new URLSearchParams()
    next.set('page', '0')
    setSearchParams(next)
  }

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Órdenes' }]} />
      <PageHeader
        title="Órdenes STORE"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void orders.refetch()} disabled={orders.isFetching}>
              {orders.isFetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Link to={routes.adminStore} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver al hub
            </Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      <ContextHeader
        badge="Operación STORE"
        title="Listado principal de órdenes"
        description="El estado de orden se mantiene separado de los indicadores operativos. Desde acá podés distinguir pending payment normal, pagada pendiente de fulfillment, conflicto operativo, fulfillment creado y cancelación manual."
        tone="store"
      />

      <StoreOrdersFilters
        query={query}
        status={status}
        operationalConflict={operationalConflict}
        fulfillment={fulfillment}
        onQueryChange={(value) => updateParam('query', value)}
        onStatusChange={(value) => updateParam('status', value)}
        onOperationalConflictChange={(value) => updateParam('operationalConflict', value)}
        onFulfillmentChange={(value) => updateParam('fulfillment', value)}
        onReset={resetFilters}
        hasActiveFilters={orders.hasActiveFilters}
      />

      {drilldownMetric || createdFrom || paidFrom || manualCancelledFrom || conflictFrom ? (
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
                {manualCancelledFrom ? `${createdFrom || createdTo || paidFrom || paidTo ? ' · ' : ''}Cancelación detectada desde ${formatDate(manualCancelledFrom)}` : null}
                {conflictFrom ? `${createdFrom || createdTo || paidFrom || paidTo || manualCancelledFrom ? ' · ' : ''}Conflicto detectado desde ${formatDate(conflictFrom)}` : null}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {orders.error && (
        <div style={{ marginTop: theme.spacing.xl }}>
          <ErrorAlert message={orders.error} />
        </div>
      )}

      {orders.isLoading ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <LoadingBlock label="Cargando órdenes STORE..." />
        </div>
      ) : orders.orders.length === 0 ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <EmptyState
            title={orders.hasActiveFilters ? 'No hay órdenes que coincidan con los filtros' : 'No hay órdenes STORE'}
            description={orders.hasActiveFilters ? 'Probá cambiando estado o búsqueda.' : undefined}
          />
        </div>
      ) : (
        <div style={{ marginTop: theme.spacing.xl }}>
          <StoreOrdersTable
            orders={orders.orders}
            page={page}
            totalPages={orders.totalPages}
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
