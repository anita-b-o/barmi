import { Link, useParams } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '../../app/theme'
import { routes } from '../../core/constants/routes'
import { PageHeader, SectionCard } from '../../design-system/patterns'
import { Button, EmptyState, ErrorAlert, LoadingBlock, StatusBadge } from '../../design-system/components'
import { EcosystemOrderDetailCards, EcosystemPaymentInitiateAction, useEcosystemOrderDetail } from '../../modules/ecosystem'

export default function EcosystemOrderDetailScreen() {
  const { orderId } = useParams()
  const order = useEcosystemOrderDetail(orderId)

  return (
    <EcosystemLayout>
      <PageHeader
        title="Detalle de orden ecosystem"
        subtitle={
          !orderId
            ? 'Order ID requerido'
            : order.data?.status === 'PENDING_PAYMENT'
              ? `Order ID: ${orderId} · pendiente de pago`
              : order.data?.status === 'PAID'
                ? `Order ID: ${orderId} · pago confirmado`
                : order.data?.status === 'CANCELLED'
                  ? `Order ID: ${orderId} · orden cancelada`
                  : `Order ID: ${orderId}`
        }
        actions={(
          <>
            <Button
              variant="secondary"
              onClick={() => {
                void order.refetch().catch(() => undefined)
              }}
              disabled={order.isLoading || order.isFetching}
            >
              {order.isFetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Link to={routes.ecosystemOrders} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver a órdenes
            </Link>
            <Link to={routes.ecosystemCatalog} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver al catálogo
            </Link>
          </>
        )}
      />

      {!orderId ? (
        <EmptyState title="Order ID requerido" description="Abrí el detalle desde el listado de órdenes ecosystem." />
      ) : order.isLoading ? (
        <LoadingBlock label="Cargando detalle de orden ecosystem..." />
      ) : order.error && !order.data ? (
        <ErrorAlert message={order.error} />
      ) : !order.data ? (
        <EmptyState title="No se encontró la orden" />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.xl }}>
          <SectionCard title="Seguimiento post-pago">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
                <span style={{ color: theme.colors.textMuted }}>Estado actual</span>
                <StatusBadge status={order.data.status} />
              </div>
              <div style={{ color: theme.colors.textMuted }}>
                {order.data.status === 'PENDING_PAYMENT'
                  ? order.isAutoRefreshing
                    ? 'La orden sigue pendiente de pago. Esta pantalla se actualizará automáticamente cada 5 segundos.'
                    : order.pollingExpired
                      ? 'La orden sigue pendiente de pago. Se detuvo la actualización automática; usá "Actualizar" para consultar de nuevo.'
                      : 'La orden sigue pendiente de pago.'
                  : order.data.status === 'PAID'
                    ? 'El pago ya fue confirmado en backend.'
                    : order.data.status === 'CANCELLED'
                      ? 'La orden fue cancelada.'
                      : 'La orden ya salió del estado pendiente de pago.'}
              </div>
              {order.error ? <ErrorAlert message={order.error} /> : null}
            </div>
          </SectionCard>
          <SectionCard title="Pago">
            <EcosystemPaymentInitiateAction
              orderId={order.data.orderId}
              orderStatus={order.data.status}
              totalAmount={order.data.totalAmount}
              currency={order.data.currency}
            />
          </SectionCard>
          <EcosystemOrderDetailCards order={order.data} />
        </div>
      )}
    </EcosystemLayout>
  )
}
