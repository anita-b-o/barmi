import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdapter } from '../../../api/adapters/storeAdapter'
import { ecosystemAdapter } from '../../../api/adapters/ecosystemAdapter'
import { isApiError } from '../../../api/client/errors'
import { AccessDeniedState, Breadcrumbs, ContextHeader } from '@/components/navigation'
import { useAuth } from '@/core/auth/authContext'
import { hasActiveEcosystemMembership, hasActiveStoreMembership } from '@/core/auth/routeGuards'
import { routes } from '@/core/constants/routes'
import AdminLayout from '@/layouts/AdminLayout'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import MetricCard from '@/components/ui/MetricCard'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { theme } from '@/app/theme'

type OrderSummaryCounts = {
  total: number
  pending: number
  paid: number
  cancelled: number
}

const emptyOrderSummaryCounts: OrderSummaryCounts = {
  total: 0,
  pending: 0,
  paid: 0,
  cancelled: 0
}

const COUNTS_PAGE_SIZE = 1

async function loadStoreCounts() {
  const [all, pending, paid, cancelled] = await Promise.all([
    storeAdapter.listOrders(0, COUNTS_PAGE_SIZE),
    storeAdapter.listOrders(0, COUNTS_PAGE_SIZE, { status: 'PENDING_PAYMENT' }),
    storeAdapter.listOrders(0, COUNTS_PAGE_SIZE, { status: 'PAID' }),
    storeAdapter.listOrders(0, COUNTS_PAGE_SIZE, { status: 'CANCELLED' })
  ])

  return {
    total: all.totalElements,
    pending: pending.totalElements,
    paid: paid.totalElements,
    cancelled: cancelled.totalElements
  }
}

async function loadEcosystemCounts() {
  const [all, pending, paid, cancelled] = await Promise.all([
    ecosystemAdapter.listOrders(0, COUNTS_PAGE_SIZE),
    ecosystemAdapter.listOrders(0, COUNTS_PAGE_SIZE, 'PENDING_PAYMENT'),
    ecosystemAdapter.listOrders(0, COUNTS_PAGE_SIZE, 'PAID'),
    ecosystemAdapter.listOrders(0, COUNTS_PAGE_SIZE, 'CANCELLED')
  ])

  return {
    total: all.totalElements,
    pending: pending.totalElements,
    paid: paid.totalElements,
    cancelled: cancelled.totalElements
  }
}

export default function AdminHomeScreen() {
  const { me, memberships, logout } = useAuth()
  const hasStore = useMemo(() => hasActiveStoreMembership(memberships), [memberships])
  const hasEco = useMemo(() => hasActiveEcosystemMembership(memberships), [memberships])
  const [storeCounts, setStoreCounts] = useState<OrderSummaryCounts>(emptyOrderSummaryCounts)
  const [ecosystemCounts, setEcosystemCounts] = useState<OrderSummaryCounts>(emptyOrderSummaryCounts)
  const [storeLoading, setStoreLoading] = useState(false)
  const [ecosystemLoading, setEcosystemLoading] = useState(false)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [ecosystemError, setEcosystemError] = useState<string | null>(null)

  const loadStoreSummary = useCallback(async () => {
    if (!hasStore) return
    setStoreLoading(true)
    setStoreError(null)
    try {
      setStoreCounts(await loadStoreCounts())
    } catch (err) {
      if (isApiError(err) && err.code === 'store_context_required') {
        setStoreError('Store context required. Abrí el FE en http://demo-store.example.com:5173')
      } else {
        setStoreError(err instanceof Error ? err.message : 'No se pudo cargar el resumen operativo de store')
      }
    } finally {
      setStoreLoading(false)
    }
  }, [hasStore])

  const loadEcosystemSummary = useCallback(async () => {
    if (!hasEco) return
    setEcosystemLoading(true)
    setEcosystemError(null)
    try {
      setEcosystemCounts(await loadEcosystemCounts())
    } catch (err) {
      if (isApiError(err)) {
        setEcosystemError(err.message)
      } else {
        setEcosystemError(err instanceof Error ? err.message : 'No se pudo cargar el resumen operativo de ecosystem')
      }
    } finally {
      setEcosystemLoading(false)
    }
  }, [hasEco])

  useEffect(() => {
    loadStoreSummary()
    loadEcosystemSummary()
  }, [loadStoreSummary, loadEcosystemSummary])

  if (!hasStore && !hasEco) return <AccessDeniedState email={me?.email} userId={me?.userId} />

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin' }, { label: 'Selección de dominios' }]} />
      <PageHeader
        title="Backoffice"
        eyebrow="Admin core"
        tone="admin"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Logout</Button>}
      />

      <ContextHeader
        badge="Entrypoint"
        title="Elegí el dominio con el que vas a operar"
        description="Desde acá derivás al hub STORE o ECOSYSTEM. Cada dominio muestra sólo las capacidades relevantes para ese contexto."
        tone="admin"
      />

      <Section title="Accesos disponibles">
        <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {hasStore && (
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 6, color: theme.colors.secondary }}>Admin de Store</div>
              <div style={{ color: theme.colors.textMuted, marginBottom: 12 }}>Gestioná tiendas, pedidos y operación diaria.</div>
              <Link to="/admin/store" style={{ color: theme.colors.primary, textDecoration: 'none' }}>Entrar al hub store</Link>
            </Card>
          )}
          {hasEco && (
            <Card>
              <div style={{ fontWeight: 700, marginBottom: 6, color: theme.colors.secondary }}>Admin de Ecosystem</div>
              <div style={{ color: theme.colors.textMuted, marginBottom: 12 }}>Gestioná ecosystems, catálogo y órdenes.</div>
              <Link to={routes.adminEcosystem} style={{ color: theme.colors.primary, textDecoration: 'none' }}>Entrar al hub ecosystem</Link>
            </Card>
          )}
        </div>
      </Section>

      {hasStore && (
        <Section
          title="Store: resumen operativo"
          action={<Button onClick={loadStoreSummary} disabled={storeLoading}>Actualizar</Button>}
        >
          {storeLoading && <LoadingBlock label="Cargando resumen operativo de store..." />}
          {storeError && <ErrorAlert message={storeError} />}
          <div style={{ color: theme.colors.textMuted, marginBottom: theme.spacing.lg }}>
            Este resumen usa conteos por estado sobre el backend actual. Las ventas agregadas no se muestran aca porque hoy no existe un endpoint analitico dedicado.
          </div>
          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <MetricCard label="Ordenes totales" value={String(storeCounts.total)} />
            <MetricCard label="Pedidos pendientes" value={String(storeCounts.pending)} tone="warning" />
            <MetricCard label="Pedidos pagados" value={String(storeCounts.paid)} tone="success" />
            <MetricCard label="Pedidos cancelados" value={String(storeCounts.cancelled)} tone="danger" />
          </div>
        </Section>
      )}

      {hasEco && (
        <Section
          title="Ecosystem: resumen operativo"
          action={<Button onClick={loadEcosystemSummary} disabled={ecosystemLoading}>Actualizar</Button>}
        >
          {ecosystemLoading && <LoadingBlock label="Cargando resumen operativo de ecosystem..." />}
          {ecosystemError && <ErrorAlert message={ecosystemError} />}
          <div style={{ color: theme.colors.textMuted, marginBottom: theme.spacing.lg }}>
            Este resumen usa conteos por estado sobre el backend actual. Las ventas agregadas no se muestran aca porque hoy no existe un endpoint analitico dedicado.
          </div>
          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <MetricCard label="Ordenes totales" value={String(ecosystemCounts.total)} />
            <MetricCard label="Pedidos pendientes" value={String(ecosystemCounts.pending)} tone="warning" />
            <MetricCard label="Pedidos pagados" value={String(ecosystemCounts.paid)} tone="success" />
            <MetricCard label="Pedidos cancelados" value={String(ecosystemCounts.cancelled)} tone="danger" />
          </div>
        </Section>
      )}
    </AdminLayout>
  )
}
