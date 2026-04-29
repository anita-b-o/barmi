import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import { SectionCard } from '@/components/navigation'
import MetricCard from '@/components/ui/MetricCard'
import KeyValueList from '@/components/ui/KeyValueList'
import { theme } from '@/app/theme'
import { formatMoney } from '@/core/utils/format'

type SummaryShape = {
  totalOrders: number
  confirmedSalesTotalAmount: number
  confirmedSalesCurrency: string | null
  ordersByStatus: Record<string, number>
  fulfillmentsByStatus: Record<string, number>
}

type AnalyticsSummaryPanelProps = {
  title: string
  description: string
  loading: boolean
  error: string | null
  onRetry: () => void
  summary: SummaryShape | null
  activeProductsLabel: string
  activeProductsValue: number
  inactiveProductsLabel: string
  inactiveProductsValue: number
}

export default function AnalyticsSummaryPanel({
  title,
  description,
  loading,
  error,
  onRetry,
  summary,
  activeProductsLabel,
  activeProductsValue,
  inactiveProductsLabel,
  inactiveProductsValue
}: AnalyticsSummaryPanelProps) {
  const confirmedSales = summary
    ? summary.confirmedSalesCurrency
      ? formatMoney(summary.confirmedSalesTotalAmount, summary.confirmedSalesCurrency)
      : String(summary.confirmedSalesTotalAmount)
    : '0'

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ color: theme.colors.textMuted }}>{description}</div>

      {loading ? <LoadingBlock label="Cargando analytics..." /> : null}
      {error ? <ErrorAlert message={error} actionLabel="Reintentar" onAction={onRetry} /> : null}
      {!loading && !error && !summary ? (
        <EmptyState title="Sin datos analytics" description="Todavía no hay datos suficientes para este resumen." />
      ) : null}

      {summary ? (
        <>
          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <MetricCard label="Órdenes totales" value={String(summary.totalOrders)} />
            <MetricCard label="Órdenes pagadas" value={String(summary.ordersByStatus.PAID ?? 0)} tone="success" />
            <MetricCard label="Total vendido confirmado" value={confirmedSales} tone="success" />
            <MetricCard label={activeProductsLabel} value={String(activeProductsValue)} />
            <MetricCard label={inactiveProductsLabel} value={String(inactiveProductsValue)} tone="warning" />
          </div>

          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <SectionCard title={`${title}: órdenes por estado`}>
              <KeyValueList
                items={Object.entries(summary.ordersByStatus).map(([status, value]) => ({
                  label: status,
                  value: String(value)
                }))}
              />
            </SectionCard>

            <SectionCard title={`${title}: fulfillments por estado`}>
              <KeyValueList
                items={Object.entries(summary.fulfillmentsByStatus).map(([status, value]) => ({
                  label: status,
                  value: String(value)
                }))}
              />
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  )
}
