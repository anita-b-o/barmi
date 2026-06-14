import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import MetricCard from '@/components/ui/MetricCard'
import Table from '@/components/primitives/Table'
import { SectionCard } from '@/components/navigation'
import { theme } from '@/app/theme'
import { formatDate } from '@/core/utils/format'
import type { StoreProductAnalytics } from '@/api/contracts/v1/storeAdmin'

type StoreProductAnalyticsTableProps = {
  loading: boolean
  error: string | null
  onRetry: () => void
  analytics: StoreProductAnalytics | null
}

function formatPercent(value: number) {
  return `${value.toLocaleString('es-AR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}%`
}

export default function StoreProductAnalyticsTable({
  loading,
  error,
  onRetry,
  analytics
}: StoreProductAnalyticsTableProps) {
  const rows = analytics?.products.map((product) => ([
    <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{product.productSlug}</span>,
    product.detailViews,
    product.cardClicks,
    product.addToCart,
    formatPercent(product.ctrPercent),
    formatPercent(product.addToCartRatePercent)
  ])) ?? []

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ color: theme.colors.textMuted, maxWidth: 760 }}>
        Analytics de productos públicos de los últimos 7 días, basado en telemetry beta agregada por slug público. El orden prioriza productos con más add to cart.
      </div>

      {loading ? <LoadingBlock label="Cargando analytics de productos..." /> : null}
      {error ? <ErrorAlert message={error} actionLabel="Reintentar" onAction={onRetry} /> : null}

      {analytics ? (
        <>
          <SectionCard title={`Periodo: ${analytics.rangeLabel}`}>
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div style={{ color: theme.colors.textMuted }}>
                Desde {formatDate(analytics.from)} hasta {formatDate(analytics.to)} · {analytics.timezone}
              </div>
              <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <MetricCard label="Product Detail Views" value={String(analytics.totals.detailViews)} />
                <MetricCard label="Product Card Clicks" value={String(analytics.totals.cardClicks)} />
                <MetricCard label="Add To Cart" value={String(analytics.totals.addToCart)} tone="success" />
                <MetricCard label="CTR" value={formatPercent(analytics.totals.ctrPercent)} />
                <MetricCard label="Add To Cart Rate" value={formatPercent(analytics.totals.addToCartRatePercent)} tone="success" />
              </div>
            </div>
          </SectionCard>

          {analytics.products.length === 0 ? (
            <EmptyState title="Sin productos públicos activos" description="Cuando la store tenga productos activos, aparecerán aunque todavía no tengan eventos." />
          ) : (
            <Table
              headers={['Producto', 'Views', 'Clicks', 'Add To Cart', 'CTR', 'Add To Cart Rate']}
              rows={rows}
              emptyMessage="Sin productos para mostrar"
            />
          )}
        </>
      ) : null}
    </div>
  )
}
