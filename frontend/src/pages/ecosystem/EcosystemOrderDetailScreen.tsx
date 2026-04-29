import { Link, useParams } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { SectionCard } from '@/components/navigation'
import Button from '@/components/primitives/Button'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import StatusBadge from '@/components/commerce/StatusBadge'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemOrderDetailCards, EcosystemPaymentInitiateAction, EcosystemSurfaceSection, useEcosystemOrderDetail } from '@/features/ecosystem'
import { Breadcrumbs } from '@/components/navigation'

export default function EcosystemOrderDetailScreen() {
  const { orderId } = useParams()
  const order = useEcosystemOrderDetail(orderId)

  return (
    <EcosystemLayout>
      <Breadcrumbs
        items={[
          { label: 'Ecosystem', href: routes.ecosystemHome },
          { label: 'Órdenes', href: routes.ecosystemOrders },
          { label: orderId ?? 'Detalle' }
        ]}
      />
      <div style={{ display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}>
        <EcosystemHeroSection
          eyebrow="Detalle de orden"
          title="Detalle de orden ecosystem"
          description={
            !orderId
              ? 'Necesitás abrir este flujo desde el listado de órdenes.'
              : order.data?.status === 'PENDING_PAYMENT'
                ? `Order ID: ${orderId} · pendiente de pago y lista para retomar el flujo.`
                : order.data?.status === 'PAID'
                  ? `Order ID: ${orderId} · pago confirmado y seguimiento consolidado.`
                  : order.data?.status === 'CANCELLED'
                    ? `Order ID: ${orderId} · orden cancelada con contexto operativo disponible.`
                    : `Order ID: ${orderId}`
          }
          badges={order.data ? (
            <>
              <EcosystemHeroBadge>{order.data.orderId}</EcosystemHeroBadge>
              <EcosystemHeroBadge variant={order.data.status === 'PAID' ? 'success' : 'info'}>
                {order.data.status}
              </EcosystemHeroBadge>
            </>
          ) : undefined}
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
              <Link to={routes.ecosystemOrders} style={{ textDecoration: 'none' }}>
                <Button variant="ghost">Volver a órdenes</Button>
              </Link>
            </>
          )}
          aside={order.data ? (
            <>
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                {order.data.status === 'PENDING_PAYMENT'
                  ? 'Mientras la orden siga pendiente, el foco está en resolver el pago y monitorear el estado.'
                  : 'Pago, estado e información operativa disponibles sin volver al listado.'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'center' }}>
                <span style={{ color: theme.colors.textMuted }}>Estado actual</span>
                <StatusBadge status={order.data.status} />
              </div>
            </>
          ) : undefined}
        />

        {!orderId ? (
          <EcosystemSurfaceSection>
            <EmptyState title="Order ID requerido" description="Abrí el detalle desde el listado de órdenes ecosystem." />
          </EcosystemSurfaceSection>
        ) : order.isLoading ? (
          <EcosystemSurfaceSection>
            <LoadingState label="Cargando detalle de orden ecosystem..." />
          </EcosystemSurfaceSection>
        ) : order.error && !order.data ? (
          <EcosystemSurfaceSection>
            <ErrorState message={order.error} />
          </EcosystemSurfaceSection>
        ) : !order.data ? (
          <EcosystemSurfaceSection>
            <EmptyState title="No se encontró la orden" />
          </EcosystemSurfaceSection>
        ) : (
          <div style={{ display: 'grid', gap: theme.spacing.xl }}>
            <EcosystemSurfaceSection tone="warm">
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
                  {order.error ? <ErrorState message={order.error} /> : null}
                </div>
              </SectionCard>
            </EcosystemSurfaceSection>
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
      </div>
    </EcosystemLayout>
  )
}
