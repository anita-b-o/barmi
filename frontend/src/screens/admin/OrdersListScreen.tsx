import { AdminLayout } from '../../layouts'
import { PageHeader } from '../../design-system/patterns'
import { Button, EmptyState, ErrorAlert, LoadingBlock } from '../../design-system/components'
import { useAuth } from '../../core/auth'
import { theme } from '../../app/theme'
import { useStoreOrdersList, StoreOrdersFilters, StoreOrdersTable } from '../../modules/orders'

export default function OrdersListScreen() {
  const { logout, me } = useAuth()
  const orders = useStoreOrdersList()

  return (
    <AdminLayout>
      <PageHeader
        title="Órdenes STORE"
        subtitle={me?.email}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void orders.refetch()} disabled={orders.isFetching}>
              {orders.isFetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </>
        )}
      />

      <StoreOrdersFilters
        query={orders.query}
        status={orders.status}
        onQueryChange={orders.setQuery}
        onStatusChange={orders.setStatus}
        onReset={orders.resetFilters}
        hasActiveFilters={orders.hasActiveFilters}
      />

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
            page={orders.page}
            totalPages={orders.totalPages}
            onPageChange={orders.setPage}
          />
        </div>
      )}
    </AdminLayout>
  )
}
