import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import MetricCard from '@/components/ui/MetricCard'
import Table from '@/components/primitives/Table'
import { theme } from '@/app/theme'
import { formatMoneyFromCents } from '@/core/utils/format'
import type { StoreFunnelAnalytics } from '@/api/contracts/v1/storeAdmin'

type StoreFunnelAnalyticsPanelProps = {
  loading: boolean
  error: string | null
  onRetry: () => void
  analytics: StoreFunnelAnalytics | null
}

function formatRate(value: number) {
  return `${(value * 100).toLocaleString('es-AR', {
    minimumFractionDigits: value === 0 || (value * 100) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}%`
}

function hasFunnelData(analytics: StoreFunnelAnalytics) {
  return analytics.listViews > 0 ||
    analytics.cardClicks > 0 ||
    analytics.detailViews > 0 ||
    analytics.addToCart > 0 ||
    analytics.orders > 0 ||
    analytics.revenueCents > 0
}

export default function StoreFunnelAnalyticsPanel({
  loading,
  error,
  onRetry,
  analytics
}: StoreFunnelAnalyticsPanelProps) {
  const conversionRows = analytics ? [
    ['Click Rate', formatRate(analytics.clickRate)],
    ['Detail Rate', formatRate(analytics.detailRate)],
    ['Add To Cart Rate', formatRate(analytics.addToCartRate)],
    ['Purchase Rate', formatRate(analytics.purchaseRate)]
  ] : []

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ color: theme.colors.textMuted, maxWidth: 760 }}>
        Funnel de los últimos 7 días que une discovery público y ventas pagadas de la store actual.
      </div>

      {loading ? <LoadingBlock label="Cargando funnel analytics..." /> : null}
      {error ? <ErrorAlert message={error} actionLabel="Reintentar" onAction={onRetry} /> : null}

      {analytics ? (
        <>
          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <MetricCard label="List Views" value={String(analytics.listViews)} />
            <MetricCard label="Card Clicks" value={String(analytics.cardClicks)} />
            <MetricCard label="Detail Views" value={String(analytics.detailViews)} />
            <MetricCard label="Add To Cart" value={String(analytics.addToCart)} tone="success" />
            <MetricCard label="Orders" value={String(analytics.orders)} />
            <MetricCard label="Revenue" value={formatMoneyFromCents(analytics.revenueCents)} tone="success" />
          </div>

          {!hasFunnelData(analytics) ? (
            <EmptyState title="Sin datos de funnel en los últimos 7 días" description="Cuando haya discovery o ventas pagadas, el funnel mostrará conversiones." />
          ) : null}

          <Table
            headers={['Conversión', 'Rate']}
            rows={conversionRows}
            emptyMessage="Sin conversiones para mostrar"
          />
        </>
      ) : null}
    </div>
  )
}
