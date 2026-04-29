import { Link, useSearchParams, useParams } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import PageHeader from '@/components/navigation/SectionHeader'
import { SectionCard, Breadcrumbs, ContextHeader } from '@/components/navigation'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import { alpha, theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth'
import Button from '@/components/primitives/Button'
import { EcosystemFulfillmentDetailCard, EcosystemFulfillmentStatusActions, useEcosystemFulfillmentDetail } from '@/features/fulfillment'

export default function AdminEcosystemFulfillmentDetailScreen() {
  const { fulfillmentId } = useParams()
  const [searchParams] = useSearchParams()
  const { memberships, logout } = useAuth()
  const activeEcosystemId = memberships.ecosystems.find((membership) => membership.status === 'ACTIVE')?.ecosystemId ?? ''
  const ecosystemId = searchParams.get('ecosystemId') ?? activeEcosystemId
  const fulfillment = useEcosystemFulfillmentDetail(fulfillmentId, ecosystemId)

  return (
    <AdminLayout>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: routes.adminHome },
          { label: 'Ecosystem', href: routes.adminEcosystem },
          { label: 'Fulfillments', href: routes.adminEcosystemFulfillments },
          { label: fulfillmentId ?? 'Detalle' }
        ]}
      />
      <PageHeader
        title="Detalle de fulfillment Ecosystem"
        subtitle={fulfillmentId}
        actions={(
          <>
            <Link to={`${routes.adminEcosystemFulfillments}?ecosystemId=${encodeURIComponent(ecosystemId)}`} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
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
          description="El detalle conserva el vínculo operativo con la orden ecosystem asociada."
        />

        {!ecosystemId ? (
          <EmptyState title="Ecosystem requerido" description="Abrí este detalle desde el listado o desde una orden del ecosystem." />
        ) : (
          <>
            <SectionCard title="Datos del fulfillment">
              {fulfillment.isLoading ? (
                <LoadingBlock label="Cargando fulfillment..." />
              ) : (
                <EcosystemFulfillmentDetailCard record={fulfillment.fulfillment} ecosystemId={ecosystemId} />
              )}
            </SectionCard>

            <SectionCard title="Actualizar estado">
              <EcosystemFulfillmentStatusActions
                currentStatus={fulfillment.currentStatus}
                loading={fulfillment.isUpdating}
                onUpdate={fulfillment.updateStatus}
              />
            </SectionCard>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
