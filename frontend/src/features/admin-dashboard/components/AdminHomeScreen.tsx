import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdapter } from '../../../api/adapters/storeAdapter'
import { ecosystemAdapter } from '../../../api/adapters/ecosystemAdapter'
import { isApiError } from '../../../api/client/errors'
import { AccessDeniedState, Breadcrumbs, ContextHeader } from '@/components/navigation'
import { useAuth } from '@/core/auth/authContext'
import { hasActiveEcosystemMembership, hasActiveStoreMembership } from '@/core/auth/routeGuards'
import { routes } from '@/core/constants/routes'
import { getBrowserTenantContext } from '@/core/tenant'
import AdminLayout from '@/layouts/AdminLayout'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import MetricCard from '@/components/ui/MetricCard'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { theme } from '@/app/theme'
import { useBetaMetricsSummary } from '@/features/beta'

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
  const tenant = useMemo(() => getBrowserTenantContext(), [])
  const hasStore = useMemo(() => hasActiveStoreMembership(memberships), [memberships])
  const canLoadStoreSummary = hasStore && tenant.scope === 'STORE' && Boolean(tenant.slug)
  const hasEco = useMemo(() => hasActiveEcosystemMembership(memberships), [memberships])
  const [storeCounts, setStoreCounts] = useState<OrderSummaryCounts>(emptyOrderSummaryCounts)
  const [ecosystemCounts, setEcosystemCounts] = useState<OrderSummaryCounts>(emptyOrderSummaryCounts)
  const [storeLoading, setStoreLoading] = useState(false)
  const [ecosystemLoading, setEcosystemLoading] = useState(false)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [ecosystemError, setEcosystemError] = useState<string | null>(null)
  const betaMetrics = useBetaMetricsSummary()

  const loadStoreSummary = useCallback(async () => {
    if (!canLoadStoreSummary) return
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
  }, [canLoadStoreSummary])

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

      <Section
        title="Beta privada: métricas mínimas"
        action={<Button onClick={() => void betaMetrics.refetch()} disabled={betaMetrics.isFetching}>Actualizar</Button>}
      >
        {betaMetrics.isLoading ? <LoadingBlock label="Cargando métricas beta..." /> : null}
        {betaMetrics.error ? <ErrorAlert message={betaMetrics.error} /> : null}
        {betaMetrics.summary ? (
          <>
            <div style={{ color: theme.colors.textMuted, marginBottom: theme.spacing.lg, lineHeight: 1.6 }}>
              Este bloque resume discovery, checkout, auth y feedback de la beta real sin dashboards enterprise ni tracking invasivo.
            </div>
            <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: theme.spacing.lg }}>
              <MetricCard label="Home views" value={String(betaMetrics.summary.homeViews)} />
              <MetricCard label="Catalog views" value={String(betaMetrics.summary.catalogViews)} />
              <MetricCard label="Map views" value={String(betaMetrics.summary.mapViews)} />
              <MetricCard label="Store views" value={String(betaMetrics.summary.storeViews)} />
              <MetricCard label="Search used" value={String(betaMetrics.summary.searchUses)} />
              <MetricCard label="Clicks discovery" value={String(betaMetrics.summary.productClicks + betaMetrics.summary.storeClicks + betaMetrics.summary.mapPinClicks)} />
              <MetricCard label="Checkout start" value={String(betaMetrics.summary.checkoutStarted)} tone="warning" />
              <MetricCard label="Pago iniciado" value={String(betaMetrics.summary.paymentInitiated)} tone="warning" />
              <MetricCard label="Checkout success %" value={`${betaMetrics.summary.checkoutSuccessRate}%`} tone="success" />
              <MetricCard label="Login failure %" value={`${betaMetrics.summary.loginFailureRate}%`} tone="danger" />
              <MetricCard label="Feedback enviados" value={String(betaMetrics.summary.feedbackSubmitted)} />
            </div>
            <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <Card variant="soft">
                <div style={{ fontWeight: 700, marginBottom: theme.spacing.sm }}>Top stores vistas</div>
                <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                  {betaMetrics.summary.topStores.length === 0 ? (
                    <div style={{ color: theme.colors.textMuted }}>Todavía no hay vistas suficientes para rankear stores.</div>
                  ) : betaMetrics.summary.topStores.map((store) => (
                    <div key={store.storeSlug} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md }}>
                      <span>{store.storeName}</span>
                      <strong>{store.views}</strong>
                    </div>
                  ))}
                </div>
              </Card>
              <Card variant="soft">
                <div style={{ fontWeight: 700, marginBottom: theme.spacing.sm }}>Top búsquedas</div>
                <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                  {betaMetrics.summary.topSearches.length === 0 ? (
                    <div style={{ color: theme.colors.textMuted }}>Todavía no hay búsquedas útiles registradas.</div>
                  ) : betaMetrics.summary.topSearches.map((search) => (
                    <div key={search.query} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md }}>
                      <span>{search.query}</span>
                      <strong>{search.uses}</strong>
                    </div>
                  ))}
                </div>
              </Card>
              <Card variant="soft">
                <div style={{ fontWeight: 700, marginBottom: theme.spacing.sm }}>Feedback por tipo</div>
                <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md }}>
                    <span>Bug</span>
                    <strong>{betaMetrics.summary.feedbackBug}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md }}>
                    <span>Confusión</span>
                    <strong>{betaMetrics.summary.feedbackConfusing}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md }}>
                    <span>Falta algo</span>
                    <strong>{betaMetrics.summary.feedbackMissing}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md }}>
                    <span>Funcionó bien</span>
                    <strong>{betaMetrics.summary.feedbackLoveIt}</strong>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </Section>

      {hasStore && (
        <Section
          title="Store: resumen operativo"
          action={canLoadStoreSummary ? <Button onClick={loadStoreSummary} disabled={storeLoading}>Actualizar</Button> : undefined}
        >
          {!canLoadStoreSummary ? (
            <Card variant="soft">
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                El resumen STORE sólo se carga dentro del host de una tienda. Desde este host general podés entrar al hub store, pero para métricas store-scoped necesitás abrir la app con el subdominio de la tienda.
              </div>
            </Card>
          ) : (
            <>
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
            </>
          )}
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
