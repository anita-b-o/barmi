import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import { SectionCard } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Button from '@/components/primitives/Button'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import StatusBadge from '@/components/commerce/StatusBadge'
import { useAuth } from '@/core/auth'
import { routes } from '@/core/constants/routes'
import { theme } from '@/app/theme'
import { EcosystemPaymentInitiateAction } from '../../payments'
import { useEcosystemOrderDetail } from '../hooks/useEcosystemOrderDetail'
import { EcosystemOrderDetailCards } from './EcosystemOrderDetailCards'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import { useEcosystemCreateFulfillment } from '@/features/fulfillment'

export default function AdminEcosystemOrderDetailScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { me, memberships, logout } = useAuth()
  const { orderId } = useParams()
  const activeEcosystemId = memberships.ecosystems.find((membership) => membership.status === 'ACTIVE')?.ecosystemId ?? ''
  const ecosystemId = searchParams.get('ecosystemId') ?? activeEcosystemId
  const order = useEcosystemOrderDetail(orderId)
  const fulfillmentCreation = useEcosystemCreateFulfillment(ecosystemId)

  return (
    <AdminLayout>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: routes.adminHome },
          { label: 'Ecosystem', href: routes.adminEcosystem },
          { label: 'Órdenes', href: routes.adminEcosystemOrders },
          { label: orderId ?? 'Detalle' }
        ]}
      />
      <PageHeader
        title="Detalle de orden Ecosystem"
        subtitle={orderId ?? me?.email}
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
            {order.data?.status === 'PAID' && ecosystemId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  if (!orderId) return
                  void fulfillmentCreation.createFulfillment(orderId)
                    .then((record) => navigate(`${routes.adminEcosystemFulfillmentDetail(record.fulfillmentId)}?ecosystemId=${encodeURIComponent(ecosystemId)}`))
                    .catch(() => undefined)
                }}
                disabled={fulfillmentCreation.loading}
              >
                {fulfillmentCreation.loading ? 'Creando fulfillment...' : 'Crear fulfillment'}
              </Button>
            ) : null}
            <Link to={routes.adminEcosystemOrders} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver a órdenes
            </Link>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </>
        )}
      />

      {!orderId ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <EmptyState title="Order ID requerido" description="Abrí el detalle desde el listado admin de órdenes ecosystem." />
        </div>
      ) : order.isLoading ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <LoadingBlock label="Cargando detalle de orden ecosystem..." />
        </div>
      ) : order.error && !order.data ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <ErrorAlert
            message={order.error}
            actionLabel="Reintentar"
            onAction={() => {
              void order.refetch().catch(() => undefined)
            }}
            actionDisabled={order.isFetching}
          />
        </div>
      ) : !order.data ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <EmptyState title="No se encontró la orden" />
        </div>
      ) : (
        <div style={{ marginTop: theme.spacing.xl, display: 'grid', gap: theme.spacing.xl }}>
          <ContextHeader
            badge={order.data.status === 'PENDING_PAYMENT' ? 'Acción principal' : 'Contexto'}
            title={order.data.status === 'PENDING_PAYMENT' ? 'Resolvé el pago desde esta orden' : 'Seguimiento operativo de la orden'}
            description={order.data.status === 'PENDING_PAYMENT'
              ? 'El foco de esta pantalla es reintentar el pago y monitorear el cambio de estado sin salir del detalle.'
              : 'Tenés el resumen completo y accesos de vuelta al listado y al hub del dominio.'}
          />
          <SectionCard title="Seguimiento operativo">
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
              {fulfillmentCreation.error ? <ErrorAlert message={fulfillmentCreation.error} /> : null}
            </div>
          </SectionCard>

          <SectionCard title="Pago">
            <EcosystemPaymentInitiateAction
              orderId={order.data.orderId}
              orderStatus={order.data.status}
              totalAmount={order.data.totalAmount}
              currency={order.data.currency}
              returnPath={routes.adminEcosystemOrderDetail(order.data.orderId)}
            />
          </SectionCard>

          <EcosystemOrderDetailCards order={order.data} />
        </div>
      )}
    </AdminLayout>
  )
}
