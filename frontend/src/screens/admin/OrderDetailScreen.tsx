import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminLayout } from '../../layouts'
import { PageHeader, SectionCard } from '../../design-system/patterns'
import { Button, EmptyState, ErrorAlert, LoadingBlock } from '../../design-system/components'
import { routes } from '../../core/constants/routes'
import { useStoreOrderDetail, StoreOrderDetailCards } from '../../modules/orders'
import { useStoreCreateFulfillment } from '../../modules/fulfillment'
import { theme } from '../../app/theme'

export default function OrderDetailScreen() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const order = useStoreOrderDetail(orderId)
  const fulfillment = useStoreCreateFulfillment()

  const isOperable = order.order?.status === 'PAID'

  const handleCreateFulfillment = async () => {
    if (!orderId) return
    const created = await fulfillment.createFulfillment(orderId)
    navigate(routes.adminFulfillmentDetail(created.fulfillmentId))
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Detalle de orden STORE"
        subtitle={orderId}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void order.refetch()} disabled={order.isFetching}>
              {order.isFetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Link to={routes.adminOrders} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
              Volver a órdenes
            </Link>
          </>
        )}
      />

      {order.error && (
        <div style={{ marginTop: theme.spacing.xl }}>
          <ErrorAlert message={order.error} />
        </div>
      )}

      {order.isLoading ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <LoadingBlock label="Cargando detalle de orden..." />
        </div>
      ) : !order.order ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <EmptyState title="No se encontró la orden" />
        </div>
      ) : (
        <div style={{ marginTop: theme.spacing.xl, display: 'grid', gap: theme.spacing.xl }}>
          <SectionCard
            title="Fulfillment"
            action={isOperable ? (
              <Button onClick={() => void handleCreateFulfillment().catch(() => undefined)} disabled={fulfillment.loading}>
                {fulfillment.loading ? 'Creando...' : 'Crear fulfillment'}
              </Button>
            ) : undefined}
          >
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {fulfillment.error ? <ErrorAlert message={fulfillment.error} /> : null}
              <div style={{ color: theme.colors.textMuted }}>
                {isOperable
                  ? 'La orden ya está pagada. Podés crear el fulfillment y se abrirá su detalle para continuar la operación.'
                  : order.order.status === 'PENDING_PAYMENT'
                    ? 'La orden todavía no admite fulfillment porque sigue pendiente de pago.'
                    : order.order.status === 'CANCELLED'
                      ? 'La orden fue cancelada y ya no admite fulfillment.'
                      : 'La orden no admite fulfillment en su estado actual.'}
              </div>
            </div>
          </SectionCard>

          <StoreOrderDetailCards order={order.order} />
        </div>
      )}
    </AdminLayout>
  )
}
