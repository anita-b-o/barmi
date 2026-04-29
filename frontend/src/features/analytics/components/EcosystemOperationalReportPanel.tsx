import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/navigation'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import MetricCard from '@/components/ui/MetricCard'
import KeyValueList from '@/components/ui/KeyValueList'
import SelectField from '@/components/primitives/Select'
import { theme } from '@/app/theme'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { EcosystemOperationalReport, EcosystemOperationalReportRange } from '@/api/contracts/v1/ecosystemAdmin'
import { routes } from '@/core/constants/routes'

const RANGE_OPTIONS: Array<{ value: EcosystemOperationalReportRange; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Ultimos 7 dias' },
  { value: '30d', label: 'Ultimos 30 dias' }
]

type EcosystemOperationalReportPanelProps = {
  range: EcosystemOperationalReportRange
  onRangeChange: (range: EcosystemOperationalReportRange) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  report: EcosystemOperationalReport | null
}

export default function EcosystemOperationalReportPanel({
  range,
  onRangeChange,
  loading,
  error,
  onRetry,
  report
}: EcosystemOperationalReportPanelProps) {
  const confirmedSales = report
    ? report.periodMetrics.confirmedSalesCurrency
      ? formatMoney(report.periodMetrics.confirmedSalesTotalAmount, report.periodMetrics.confirmedSalesCurrency)
      : String(report.periodMetrics.confirmedSalesTotalAmount)
    : '0'

  const buildOrdersDrilldown = (params: Record<string, string>) => {
    const search = new URLSearchParams({
      ecosystemId: report?.ecosystemId ?? '',
      ...params,
      drilldownMetric: params.drilldownMetric,
      rangeLabel: report?.rangeLabel ?? ''
    })
    return `${routes.adminEcosystemOrders}?${search.toString()}`
  }

  const buildFulfillmentsDrilldown = (params: Record<string, string>) => {
    const search = new URLSearchParams({
      ecosystemId: report?.ecosystemId ?? '',
      ...params,
      drilldownMetric: params.drilldownMetric,
      rangeLabel: report?.rangeLabel ?? ''
    })
    return `${routes.adminEcosystemFulfillments}?${search.toString()}`
  }

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ color: theme.colors.textMuted, maxWidth: 720 }}>
          Reporte operativo simple del tramo reciente. En ECOSYSTEM el periodo usa orden creada, pago confirmado y fulfillment creado; el snapshot muestra el estado actual de fulfillments. No se exponen conflictos operativos porque hoy no hay un equivalente modelado como en STORE.
        </div>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>Periodo</div>
          <SelectField
            value={range}
            onChange={(event) => onRangeChange(event.target.value as EcosystemOperationalReportRange)}
            options={RANGE_OPTIONS}
            aria-label="Periodo del reporte operativo ECOSYSTEM"
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
