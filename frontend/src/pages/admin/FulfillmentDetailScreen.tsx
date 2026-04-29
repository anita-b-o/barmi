import { Link, useParams } from 'react-router-dom'
import { AdminLayout } from '../../layouts'
import PageHeader from '@/components/navigation/SectionHeader'
import { SectionCard } from '@/components/navigation'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import Button from '@/components/primitives/Button'
import { useStoreFulfillmentDetail, StoreFulfillmentDetailCard, StoreFulfillmentStatusActions } from '@/features/fulfillment'
import { alpha, theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import { useAuth } from '@/core/auth'

export default function FulfillmentDetailScreen() {
  const { fulfillmentId } = useParams()
  const { logout } = useAuth()
  const fulfillment = useStoreFulfillmentDetail(fulfillmentId)

  return (
    <AdminLayout>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: routes.adminHome },
          { label: 'Store', href: routes.adminStore },
          { label: 'Fulfillments', href: routes.adminFulfillments },
          { label: fulfillmentId ?? 'Detalle' }
        ]}
      />
      <PageHeader
        title="Detalle de fulfillment STORE"
        subtitle={fulfillmentId}
        actions={(
          <>
            <Link to={routes.adminFulfillments} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver a fulfillments
            </Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      {fulfillment.error ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={fulfillment.error} />
        </div>
      ) : null}

      {fulfillment.successMessage ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <div
            style={{
              background: alpha(theme.colors.success, 0.1),
              border: `1px solid ${alpha(theme.colors.success, 0.24)}`,
              color: theme.colors.success,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.md
            }}
          >
            {fulfillment.successMessage}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: theme.spacing.xl, display: 'grid', gap: theme.spacing.xl }}>
        <ContextHeader
          badge="Entidad relacionada"
          title="Gestioná el fulfillment y volvé a la orden cuando haga falta"
          description="El detalle incluye acceso directo a la orden asociada, así evitás perder contexto entre operación y seguimiento."
        />
        <SectionCard title="Datos del fulfillment">
          {fulfillment.isLoading ? (
            <LoadingBlock label="Cargando fulfillment..." />
          ) : (
            <StoreFulfillmentDetailCard record={fulfillment.fulfillment} />
          )}
        </SectionCard>

        <SectionCard title="Actualizar estado">
          <StoreFulfillmentStatusActions
            currentStatus={fulfillment.currentStatus}
            loading={fulfillment.isUpdating}
            onUpdate={fulfillment.updateStatus}
          />
        </SectionCard>
      </div>
    </AdminLayout>
  )
}
