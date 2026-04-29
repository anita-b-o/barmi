import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/navigation'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import MetricCard from '@/components/ui/MetricCard'
import KeyValueList from '@/components/ui/KeyValueList'
import SelectField from '@/components/primitives/Select'
import { theme } from '@/app/theme'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { StoreOperationalReport, StoreOperationalReportRange } from '@/api/contracts/v1/storeAdmin'
import { routes } from '@/core/constants/routes'

const RANGE_OPTIONS: Array<{ value: StoreOperationalReportRange; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Ultimos 7 dias' },
  { value: '30d', label: 'Ultimos 30 dias' }
]

type StoreOperationalReportPanelProps = {
  range: StoreOperationalReportRange
  onRangeChange: (range: StoreOperationalReportRange) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  report: StoreOperationalReport | null
}

export default function StoreOperationalReportPanel({
  range,
  onRangeChange,
  loading,
  error,
  onRetry,
  report
}: StoreOperationalReportPanelProps) {
  const confirmedSales = report
    ? report.periodMetrics.confirmedSalesCurrency
      ? formatMoney(report.periodMetrics.confirmedSalesTotalAmount, report.periodMetrics.confirmedSalesCurrency)
      : String(report.periodMetrics.confirmedSalesTotalAmount)
    : '0'

  const buildOrdersDrilldown = (params: Record<string, string>) => {
    const search = new URLSearchParams({
      ...params,
      drilldownMetric: params.drilldownMetric,
      rangeLabel: report?.rangeLabel ?? ''
    })
    return `${routes.adminOrders}?${search.toString()}`
  }

  const buildFulfillmentsDrilldown = (params: Record<string, string>) => {
    const search = new URLSearchParams({
      ...params,
      drilldownMetric: params.drilldownMetric,
      rangeLabel: report?.rangeLabel ?? ''
    })
    return `${routes.adminFulfillments}?${search.toString()}`
  }

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ color: theme.colors.textMuted, maxWidth: 720 }}>
          Reporte operativo simple para mirar el tramo reciente entre el summary global y el detalle manual. Las metricas del periodo usan fecha de creacion, confirmacion o evento segun corresponda; el bloque de fulfillments por estado es snapshot actual.
        </div>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>Periodo</div>
          <SelectField
            value={range}
            onChange={(event) => onRangeChange(event.target.value as StoreOperationalReportRange)}
            options={RANGE_OPTIONS}
            aria-label="Periodo del reporte operativo"
          />
        </div>
      </div>

      {loading ? <LoadingBlock label="Cargando reporte operativo..." /> : null}
      {error ? <ErrorAlert message={error} actionLabel="Reintentar" onAction={onRetry} /> : null}

      {report ? (
        <>
          <SectionCard title={`Periodo: ${report.rangeLabel}`}>
            <KeyValueList
              items={[
                { label: 'Desde', value: formatDate(report.from) },
                { label: 'Hasta', value: formatDate(report.to) },
                { label: 'Timezone', value: report.timezone }
              ]}
            />
          </SectionCard>

          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <Link
              to={buildOrdersDrilldown({
                drilldownMetric: 'ordersCreated',
                createdFrom: report.from,
                createdTo: report.to
              })}
              style={{ textDecoration: 'none' }}
            >
              <MetricCard label="Ordenes creadas" value={String(report.periodMetrics.ordersCreated)} />
            </Link>
            <Link
              to={buildOrdersDrilldown({
                drilldownMetric: 'paymentsConfirmed',
                paidFrom: report.from,
                paidTo: report.to
              })}
              style={{ textDecoration: 'none' }}
            >
              <MetricCard label="Pagos confirmados" value={String(report.periodMetrics.paymentsConfirmed)} tone="success" />
            </Link>
            <Link
              to={buildOrdersDrilldown({
                drilldownMetric: 'manualCancellations',
                manuallyCancelled: 'true',
                manualCancelledFrom: report.from,
                manualCancelledTo: report.to
              })}
              style={{ textDecoration: 'none' }}
            >
              <MetricCard label="Cancelaciones manuales" value={String(report.periodMetrics.manualCancellations)} tone="warning" />
            </Link>
            <Link
              to={buildOrdersDrilldown({
                drilldownMetric: 'stockConflicts',
                hasConflictEvent: 'true',
                conflictFrom: report.from,
                conflictTo: report.to
              })}
              style={{ textDecoration: 'none' }}
            >
              <MetricCard label="Conflictos operativos" value={String(report.periodMetrics.stockConflicts)} tone="danger" />
            </Link>
            <Link
              to={buildFulfillmentsDrilldown({
                drilldownMetric: 'fulfillmentsCreated',
                createdFrom: report.from,
                createdTo: report.to
              })}
              style={{ textDecoration: 'none' }}
            >
              <MetricCard label="Fulfillments creados" value={String(report.periodMetrics.fulfillmentsCreated)} />
            </Link>
            <MetricCard label="Venta confirmada" value={confirmedSales} tone="success" />
          </div>

          <SectionCard title="Snapshot actual de fulfillments">
            <KeyValueList
              items={Object.entries(report.currentSnapshot.fulfillmentsByStatus).map(([status, value]) => ({
                label: status,
                value: String(value)
              }))}
            />
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
