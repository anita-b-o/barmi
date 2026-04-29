import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import SelectField from '@/components/primitives/Select'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import { Breadcrumbs, ContextHeader, SectionCard } from '@/components/navigation'
import { useAuth } from '@/core/auth'
import { routes } from '@/core/constants/routes'
import { theme } from '@/app/theme'
import { EcosystemFulfillmentTable, useEcosystemFulfillments } from '@/features/fulfillment'
import { formatDate } from '@/core/utils/format'

export default function AdminEcosystemFulfillmentListScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { me, memberships, logout } = useAuth()
  const activeEcosystems = memberships.ecosystems.filter((membership) => membership.status === 'ACTIVE')
  const [ecosystemId, setEcosystemId] = useState(searchParams.get('ecosystemId') ?? '')
  const createdFrom = searchParams.get('createdFrom') ?? undefined
  const createdTo = searchParams.get('createdTo') ?? undefined
  const drilldownMetric = searchParams.get('drilldownMetric')
  const rangeLabel = searchParams.get('rangeLabel')
  const drilldownLabel = ({
    fulfillmentsCreated: 'Fulfillments creados'
  } as Record<string, string>)[drilldownMetric ?? ''] ?? drilldownMetric
  const fulfillmentList = useEcosystemFulfillments(ecosystemId, { createdFrom, createdTo })

  useEffect(() => {
    if (!ecosystemId && activeEcosystems.length > 0) {
      setEcosystemId(activeEcosystems[0].ecosystemId)
    }
  }, [activeEcosystems, ecosystemId])

  useEffect(() => {
    if (ecosystemId && searchParams.get('ecosystemId') !== ecosystemId) {
      const next = new URLSearchParams(searchParams)
      next.set('ecosystemId', ecosystemId)
      setSearchParams(next, { replace: true })
    }
  }, [ecosystemId, searchParams, setSearchParams])

  const ecosystemOptions = useMemo(() => activeEcosystems.map((membership) => ({
    value: membership.ecosystemId,
    label: `${membership.ecosystemSlug} (${membership.role})`
  })), [activeEcosystems])

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Ecosystem', href: routes.adminEcosystem }, { label: 'Fulfillments' }]} />
      <PageHeader
        title="Fulfillments Ecosystem"
        subtitle={me?.email}
        actions={(
          <>
            <Link to={routes.adminEcosystem} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
              Volver al hub
            </Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      <ContextHeader
        badge="Operación logística"
        title="Seguimiento de fulfillments del ecosystem"
        description="Creá fulfillments desde órdenes pagadas y administrá el estado desde el detalle operativo."
      />

      <Section title="Ecosystem activo">
        <Card>
          {activeEcosystems.length === 0 ? (
            <EmptyState title="No hay ecosystems activos" description="Necesitás una membership activa para operar fulfillments." />
          ) : (
            <SelectField
              value={ecosystemId}
              onChange={(event) => setEcosystemId(event.target.value)}
              options={ecosystemOptions}
            />
          )}
        </Card>
      </Section>

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
        <SectionCard title="Fulfillments del ecosystem actual">
          {!ecosystemId ? (
            <EmptyState title="Seleccioná un ecosystem" description="Elegí un ecosystem activo para cargar fulfillments." />
          ) : fulfillmentList.loading ? (
            <LoadingBlock label="Cargando fulfillments del ecosystem..." />
          ) : (
            <EcosystemFulfillmentTable
              rows={fulfillmentList.fulfillments}
              onOpenDetail={(fulfillmentId) => navigate(`${routes.adminEcosystemFulfillmentDetail(fulfillmentId)}?ecosystemId=${encodeURIComponent(ecosystemId)}`)}
            />
          )}
        </SectionCard>
      </div>
    </AdminLayout>
  )
}
