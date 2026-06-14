import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import MetricCard from '@/components/ui/MetricCard'
import Table from '@/components/primitives/Table'
import { theme } from '@/app/theme'
import { formatMoneyFromCents } from '@/core/utils/format'
import type { StoreCommerceAnalytics } from '@/api/contracts/v1/storeAdmin'

type StoreCommerceAnalyticsPanelProps = {
  loading: boolean
  error: string | null
  onRetry: () => void
  analytics: StoreCommerceAnalytics | null
}

export default function StoreCommerceAnalyticsPanel({
  loading,
  error,
  onRetry,
  analytics
}: StoreCommerceAnalyticsPanelProps) {
  const rows = analytics?.topProducts.map((product) => ([
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{product.productName}</span>
      <span style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size, overflowWrap: 'anywhere' }}>{product.productSlug}</span>
    </div>,
    product.quantitySold,
    formatMoneyFromCents(product.revenueCents)
  ])) ?? []

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ color: theme.colors.textMuted, maxWidth: 760 }}>
        Ventas de la store actual en los últimos 7 días, calculadas sobre órdenes pagadas y sus items.
      </div>

      {loading ? <LoadingBlock label="Cargando commerce analytics..." /> : null}
      {error ? <ErrorAlert message={error} actionLabel="Reintentar" onAction={onRetry} /> : null}

      {analytics ? (
        <>
          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <MetricCard label="Orders" value={String(analytics.orders)} />
            <MetricCard label="Revenue" value={formatMoneyFromCents(analytics.revenueCents)} tone="success" />
            <MetricCard label="Average Order Value" value={formatMoneyFromCents(analytics.averageOrderValueCents)} />
            <MetricCard label="Products Sold" value={String(analytics.productsSold)} />
          </div>

          {analytics.topProducts.length === 0 ? (
            <EmptyState title="Sin ventas en los últimos 7 días" description="Cuando haya órdenes pagadas, aparecerán los productos vendidos." />
          ) : (
            <Table
              headers={['Product', 'Quantity Sold', 'Revenue']}
              rows={rows}
              emptyMessage="Sin productos vendidos"
            />
          )}
        </>
      ) : null}
    </div>
  )
}
