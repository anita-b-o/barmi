import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdapter } from '../../../../api/adapters/storeAdapter'
import { isApiError } from '../../../../api/client/errors'
import type { StoreOrdersPage } from '../../../../api/contracts/v1/store'
import { routes } from '@/core/constants/routes'
import { formatDate, formatMoney } from '@/core/utils/format'
import PublicStoreLayout from '@/layouts/PublicStoreLayout'
import { Breadcrumbs } from '@/components/navigation'
import DetailCard from '@/components/ui/DetailCard'
import StatusBadge from '@/components/commerce/StatusBadge'
import LoadingBlock from '@/components/feedback/LoadingState'
import ErrorAlert from '@/components/feedback/ErrorState'
import EmptyState from '@/components/feedback/EmptyState'
import { theme } from '@/app/theme'
import Button from '@/components/primitives/Button'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemSurfaceSection } from '@/features/ecosystem'

function getOrderStatusCopy(status: string, hasOperationalIssue: boolean) {
  if (hasOperationalIssue) {
    return {
      badge: 'STOCK_CONFLICT',
      title: 'Pago confirmado con conflicto operativo',
      description: 'La orden necesita revisión interna antes de avanzar.'
    }
  }
  if (status === 'PENDING_PAYMENT') {
    return {
      badge: 'PENDING',
      title: 'Pago pendiente',
      description: 'Todavía podés entrar al detalle para completar el pago.'
    }
  }
  if (status === 'PAID') {
    return {
      badge: 'PAID',
      title: 'Pago confirmado',
      description: 'La orden ya fue registrada como pagada y sigue su preparación.'
    }
  }
  return {
    badge: 'CANCELLED',
    title: 'Orden cancelada',
    description: 'La orden quedó cerrada y ya no admite nuevas acciones.'
  }
}

export default function OrdersListScreen() {
  const [data, setData] = useState<StoreOrdersPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const loadOrders = useCallback(() => {
    let active = true
    setLoading(true)
    setError(null)
    storeAdapter.listOrders()
      .then((res) => {
        if (!active) return
        setData(res)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (isApiError(err) && err.code === 'store_context_required') {
          setError('Store context required. Abrí el FE en http://demo-store.example.com:5173')
          return
        }
        setError(err instanceof Error ? err.message : 'Error cargando órdenes')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return loadOrders()
  }, [loadOrders, reloadKey])

  return (
    <PublicStoreLayout>
      <Breadcrumbs items={[{ label: 'Store', href: routes.publicStore('demo-store') }, { label: 'Mis órdenes' }]} />
      <div style={{ display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}>
        <EcosystemHeroSection
          eyebrow="Store orders"
          title="Mis órdenes"
          description="Abrí el detalle para seguir órdenes pendientes de pago, revisar órdenes cerradas o confirmar qué compraste."
          badges={(
            <>
              <EcosystemHeroBadge>Seguimiento público</EcosystemHeroBadge>
              {data ? <EcosystemHeroBadge variant="info">{data.content.length} órdenes</EcosystemHeroBadge> : null}
            </>
          )}
          actions={(
            <Link to={routes.publicStore('demo-store')} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Volver a la tienda</Button>
            </Link>
          )}
          aside={(
            <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
              Entrá al detalle sólo cuando necesites revisar estado, reintentar pago o confirmar qué compraste.
            </div>
          )}
        />

        {loading ? <EcosystemSurfaceSection><LoadingBlock label="Cargando órdenes..." /></EcosystemSurfaceSection> : null}
        {error ? (
          <EcosystemSurfaceSection>
            <ErrorAlert
              message={error}
              actionLabel="Reintentar"
              onAction={() => setReloadKey((current) => current + 1)}
              actionDisabled={loading}
            />
          </EcosystemSurfaceSection>
        ) : null}

        {data && !error ? (
          <EcosystemSurfaceSection tone="warm">
            {data.content.length === 0 && <EmptyState title="No hay órdenes." />}
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              {data.content.map((order) => (
                <DetailCard key={order.orderId}>
                {(() => {
                  const statusCopy = getOrderStatusCopy(order.status, Boolean(order.operationalIssue))
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.lg }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{order.orderId}</div>
                          <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{formatDate(order.createdAt)}</div>
                          <div style={{ marginTop: 8, fontWeight: 600 }}>{statusCopy.title}</div>
                          <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{statusCopy.description}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div><StatusBadge status={statusCopy.badge} /></div>
                          <div style={{ marginTop: 8, fontWeight: 600 }}>{formatMoney(order.totalAmount, order.currency)}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: theme.spacing.lg }}>
                        <Link to={`/store/orders/${order.orderId}`} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
                          {order.status === 'PENDING_PAYMENT' && !order.operationalIssue ? 'Completar pago y seguimiento' : 'Ver seguimiento'}
                        </Link>
                      </div>
                    </>
                  )
                })()}
                </DetailCard>
              ))}
            </div>
          </EcosystemSurfaceSection>
        ) : null}
      </div>
    </PublicStoreLayout>
  )
}
