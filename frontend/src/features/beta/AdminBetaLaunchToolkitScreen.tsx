import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { betaAdapter, type BetaStore, type BetaStoreStatus } from '@/api/adapters/betaAdapter'
import { theme } from '@/app/theme'
import { useAuth } from '@/core/auth'
import { routes } from '@/core/constants/routes'
import { formatDate } from '@/core/utils/format'
import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import DataTable from '@/components/primitives/Table'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'

type FilterValue = 'ALL' | BetaStoreStatus

const filterOptions: Array<{ value: FilterValue; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'READY', label: 'Ready' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'NOT_STARTED', label: 'Not Started' }
]

const statusCopy: Record<BetaStoreStatus, { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  READY: { label: 'Ready', variant: 'success' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  NOT_STARTED: { label: 'Not Started', variant: 'neutral' }
}

function statusFor(store: BetaStore): BetaStoreStatus {
  if (store.betaStatus) return store.betaStatus
  if (store.publishReady) return 'READY'
  if (store.readinessScore <= 0) return 'NOT_STARTED'
  return 'IN_PROGRESS'
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      border: `1px solid ${theme.colors.borderDefault}`,
      borderRadius: theme.radius.md,
      background: theme.colors.bgSurface,
      padding: theme.spacing.lg,
      minHeight: 96
    }}>
      <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size, fontWeight: 700 }}>{label}</div>
      <div style={{ color: theme.colors.textPrimary, fontSize: 28, fontWeight: 800, marginTop: theme.spacing.xs }}>{value}</div>
    </div>
  )
}

function BetaStatusBadge({ status }: { status: BetaStoreStatus }) {
  const copy = statusCopy[status]
  return <Badge variant={copy.variant}>{copy.label}</Badge>
}

function typeLabel(store: BetaStore) {
  const capabilities = new Set(store.capabilitiesEnabled)
  if (capabilities.has('PRODUCTS') || capabilities.has('CHECKOUT') || capabilities.has('SHIPPING')) return 'Tienda online'
  if (capabilities.has('GALLERY')) return 'Portfolio'
  if (capabilities.has('BLOG')) return 'Contenido'
  return store.appearancePreset
}

export default function AdminBetaLaunchToolkitScreen() {
  const { me, logout, authRequest, isAuthenticated } = useAuth()
  const [filter, setFilter] = useState<FilterValue>('ALL')

  const query = useQuery({
    queryKey: ['beta-launch-stores'],
    queryFn: () => betaAdapter.getStores(authRequest),
    enabled: isAuthenticated
  })

  const stores = query.data ?? []
  const metrics = useMemo(() => {
    const counts = { total: stores.length, ready: 0, inProgress: 0, notStarted: 0 }
    stores.forEach((store) => {
      const status = statusFor(store)
      if (status === 'READY') counts.ready += 1
      if (status === 'IN_PROGRESS') counts.inProgress += 1
      if (status === 'NOT_STARTED') counts.notStarted += 1
    })
    return counts
  }, [stores])

  const visibleStores = useMemo(() => {
    return stores.filter((store) => filter === 'ALL' || statusFor(store) === filter)
  }, [filter, stores])

  const rows = visibleStores.map((store) => {
    const status = statusFor(store)
    return [
      <div key={`${store.storeId}-store`} style={{ display: 'grid', gap: 2 }}>
        <strong style={{ color: theme.colors.textPrimary }}>{store.storeName}</strong>
        <span style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>{store.storeSlug}</span>
      </div>,
      <span key={`${store.storeId}-type`}>{typeLabel(store)}</span>,
      <strong key={`${store.storeId}-score`}>{store.readinessScore}</strong>,
      <BetaStatusBadge key={`${store.storeId}-ready`} status={status} />,
      <span key={`${store.storeId}-created`}>{formatDate(store.createdAt)}</span>
    ]
  })

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Beta' }]} />
      <PageHeader
        title="Beta Launch Toolkit"
        eyebrow="Product operations"
        tone="admin"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Logout</Button>}
      />

      <ContextHeader
        badge="Beta cerrada"
        title="Primeros usuarios beta"
        description="Estado operativo de stores para priorizar acompañamiento antes y durante la publicación."
        tone="admin"
      />

      {query.error ? <ErrorAlert message="No se pudo cargar el toolkit beta." /> : null}
      {query.isLoading ? <LoadingBlock label="Cargando stores beta..." /> : null}

      <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: theme.spacing.xl }}>
        <MetricTile label="Total stores" value={metrics.total} />
        <MetricTile label="Ready" value={metrics.ready} />
        <MetricTile label="In Progress" value={metrics.inProgress} />
        <MetricTile label="Not Started" value={metrics.notStarted} />
      </div>

      <Section title="Stores">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.lg }}>
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={filter === option.value ? 'primary' : 'secondary'}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <DataTable
          headers={['Store', 'Tipo', 'Score', 'Publish Ready', 'Creada']}
          rows={rows}
          emptyMessage="Sin stores para este filtro"
        />
      </Section>
    </AdminLayout>
  )
}
