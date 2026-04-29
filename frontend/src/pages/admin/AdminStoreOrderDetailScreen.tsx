import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminLayout } from '../../layouts'
import { SectionCard } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Button from '@/components/primitives/Button'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { routes } from '@/core/constants/routes'
import { useAdminStoreOrderDetail, useStoreOrderAdminActions, StoreOrderDetailCards } from '@/features/orders'
import { useStoreCreateFulfillment } from '@/features/fulfillment'
import { theme } from '@/app/theme'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'

export default function OrderDetailScreen() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const order = useAdminStoreOrderDetail(orderId)
  const fulfillment = useStoreCreateFulfillment()
  const adminActions = useStoreOrderAdminActions(orderId)

  const summary = order.order?.operationalSummary
  const hasOperationalConflict = summary?.hasOperationalConflict ?? false
  const hasFulfillment = summary?.hasFulfillment ?? false
  const isOperable = order.order?.status === 'PAID' && !hasOperationalConflict && !hasFulfillment
  const canCancel = summary?.canCancel ?? false
  const canRetryProcessing = summary?.canRetryProcessing ?? false

  const handleCreateFulfillment = async () => {
    if (!orderId) return
    const created = await fulfillment.createFulfillment(orderId)
    navigate(routes.adminFulfillmentDetail(created.fulfillmentId))
  }

  const handleCancelOrder = async () => {
    await adminActions.cancelOrder()
  }

  const handleRetryProcessing = async () => {
    await adminActions.retryProcessing()
  }

  return (
    <AdminLayout>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: routes.adminHome },
          { label: 'Store', href: routes.adminStore },
          { label: 'Órdenes', href: routes.adminOrders },
          { label: orderId ?? 'Detalle' }
        ]}
      />
      <PageHeader
        title="Detalle de orden STORE"
        subtitle={orderId}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void order.refetch()} disabled={order.isFetching}>
              {order.isFetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Link to={routes.adminOrders} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
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
          <ContextHeader
            badge={isOperable ? 'Acción principal' : 'Contexto'}
            title={isOperable ? 'Creá el fulfillment desde esta orden' : 'Revisá el estado operativo antes de seguir'}
            description={isOperable
              ? 'La orden ya está pagada. La acción dominante acá es abrir el fulfillment y continuar la operación logística.'
              : 'Esta vista concentra el estado, los totales y el camino de vuelta al listado para evitar navegación dispersa.'}
          />
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
                {hasOperationalConflict
                  ? 'La orden tiene un conflicto operativo post-pago. No admite fulfillment hasta que el equipo revise stock y defina el siguiente paso manual.'
                  : hasFulfillment
                  ? 'La orden ya tiene un fulfillment creado. Continuá la operación desde el detalle de fulfillment.'
                  : isOperable
                  ? 'La orden ya está pagada. Podés crear el fulfillment y se abrirá su detalle para continuar la operación.'
                  : order.order.status === 'PENDING_PAYMENT'
                    ? 'La orden todavía no admite fulfillment porque sigue pendiente de pago.'
                    : order.order.status === 'CANCELLED'
                      ? 'La orden fue cancelada y ya no admite fulfillment.'
                      : 'La orden no admite fulfillment en su estado actual.'}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Operación manual"
            action={(
              <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                {canRetryProcessing ? (
                  <Button variant="secondary" onClick={() => void handleRetryProcessing().catch(() => undefined)} disabled={adminActions.retrying}>
                    {adminActions.retrying ? 'Reprocesando...' : 'Reintentar procesamiento'}
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button onClick={() => void handleCancelOrder().catch(() => undefined)} disabled={adminActions.cancelling}>
                    {adminActions.cancelling ? 'Cancelando...' : 'Cancelar orden'}
                  </Button>
                ) : null}
              </div>
            )}
          >
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {adminActions.cancelError ? <ErrorAlert message={adminActions.cancelError} /> : null}
              {adminActions.retryError ? <ErrorAlert message={adminActions.retryError} /> : null}
              <div style={{ color: theme.colors.textMuted }}>
                {canRetryProcessing
                  ? 'Si el stock ya fue corregido manualmente, podés reintentar el procesamiento para completar la orden sin duplicar fulfillment.'
                  : canCancel
                    ? 'La cancelación manual sólo está disponible mientras la orden no tenga fulfillment creado.'
                    : hasFulfillment
                      ? 'La orden ya tiene fulfillment creado. Las acciones manuales sobre la orden quedan cerradas.'
                      : order.order.operationalSummary.manuallyCancelled
                        ? 'La orden ya fue cancelada manualmente.'
                        : order.order.status === 'PENDING_PAYMENT' && !order.order.operationalSummary.paymentConfirmed
                          ? 'La orden sigue pendiente de pago y todavía no hay conflicto operativo reintentable.'
                          : 'No hay acciones manuales disponibles para esta orden en su estado actual.'}
              </div>
            </div>
          </SectionCard>

          <StoreOrderDetailCards order={order.order} />
        </div>
      )}
    </AdminLayout>
  )
}
