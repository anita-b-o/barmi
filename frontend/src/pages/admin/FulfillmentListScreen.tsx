import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AdminLayout } from '../../layouts'
import { SectionCard } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth'
import { StoreFulfillmentTable, useStoreFulfillments } from '@/features/fulfillment'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import { formatDate } from '@/core/utils/format'

export default function FulfillmentListScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { me, logout } = useAuth()
  const createdFrom = searchParams.get('createdFrom') ?? undefined
  const createdTo = searchParams.get('createdTo') ?? undefined
  const drilldownMetric = searchParams.get('drilldownMetric')
  const rangeLabel = searchParams.get('rangeLabel')
  const drilldownLabel = ({
    fulfillmentsCreated: 'Fulfillments creados'
  } as Record<string, string>)[drilldownMetric ?? ''] ?? drilldownMetric
  const fulfillmentList = useStoreFulfillments({ createdFrom, createdTo })

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Fulfillments' }]} />
      <PageHeader
        title="Fulfillments STORE"
        subtitle={me?.email}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void fulfillmentList.refetch()} disabled={fulfillmentList.fetching}>
              {fulfillmentList.fetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Link to={routes.adminStore} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver al hub
            </Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      <ContextHeader
        badge="Operación logística"
        title="Seguimiento de fulfillments"
        description="Entrá al detalle para cambiar estado o volver a la orden relacionada. Acá no se crean tareas nuevas salvo desde la orden."
      />

      {drilldownMetric || createdFrom ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <Card variant="soft">
            <div style={{ display: 'grid', gap: theme.spacing.sm }}>
              <strong>Drill-down operativo activo</strong>
              <div style={{ color: theme.colors.textMuted }}>
                {drilldownLabel ?? 'Filtro temporal aplicado'}{rangeLabel ? ` · ${rangeLabel}` : ''}
              </div>
              <div style={{ color: theme.colors.textMuted }}>
                {createdFrom ? `Creación desde ${formatDate(createdFrom)}` : null}
                {createdFrom && createdTo ? ' · ' : null}
                {createdTo ? `hasta ${formatDate(createdTo)}` : null}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {fulfillmentList.error ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert
            message={fulfillmentList.error}
            actionLabel="Reintentar"
            onAction={() => { void fulfillmentList.refetch().catch(() => undefined) }}
            actionDisabled={fulfillmentList.fetching}
          />
        </div>
      ) : null}

      <div style={{ marginTop: theme.spacing.xl }}>
        <SectionCard title="Fulfillments de la store actual">
          {fulfillmentList.loading ? (
            <LoadingBlock label="Cargando fulfillments..." />
          ) : (
            <StoreFulfillmentTable
              rows={fulfillmentList.fulfillments}
              onOpenDetail={(fulfillmentId) => navigate(routes.adminFulfillmentDetail(fulfillmentId))}
            />
          )}
        </SectionCard>
      </div>
    </AdminLayout>
  )
}
