import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth/authContext'
import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import SelectField from '@/components/primitives/Select'
import EmptyState from '@/components/feedback/EmptyState'
import { theme } from '@/app/theme'
import type { EcosystemOperationalReportRange } from '@/api/contracts/v1/ecosystemAdmin'
import { AnalyticsSummaryPanel, EcosystemOperationalReportPanel, useEcosystemAnalyticsSummary, useEcosystemOperationalReport } from '@/features/analytics'

const operationalAreas = [
  {
    title: 'Órdenes',
    description: 'Seguí órdenes pendientes de pago, revisá órdenes cerradas y reintentá pagos cuando corresponda.',
    href: routes.adminEcosystemOrders,
    cta: 'Abrir órdenes'
  },
  {
    title: 'Productos externos',
    description: 'Gestioná el catálogo externo, el estado activo y el soporte de delivery de cada producto.',
    href: routes.adminEcosystemProducts,
    cta: 'Gestionar productos'
  },
  {
    title: 'Fulfillments',
    description: 'Supervisá fulfillments del ecosystem y sus transiciones operativas.',
    href: routes.adminEcosystemFulfillments,
    cta: 'Abrir fulfillments'
  },
  {
    title: 'Zonas de envío',
    description: 'Configurá cobertura y costos de envío para el ecosystem activo.',
    href: routes.adminEcosystemShipping,
    cta: 'Gestionar zonas'
  },
  {
    title: 'Promociones',
    description: 'Administrá cupones simples con descuento fijo o porcentual para el checkout público.',
    href: routes.adminEcosystemPromotions,
    cta: 'Gestionar promociones'
  }
]

export default function AdminEcosystemScreen() {
  const { me, memberships, logout } = useAuth()
  const activeEcosystems = memberships.ecosystems.filter((membership) => membership.status === 'ACTIVE')
  const [ecosystemId, setEcosystemId] = useState(activeEcosystems[0]?.ecosystemId ?? '')
  const [reportRange, setReportRange] = useState<EcosystemOperationalReportRange>('7d')
  const analytics = useEcosystemAnalyticsSummary(ecosystemId)
  const operationalReport = useEcosystemOperationalReport(ecosystemId, reportRange)

  useEffect(() => {
    if (!ecosystemId && activeEcosystems.length > 0) {
      setEcosystemId(activeEcosystems[0].ecosystemId)
    }
  }, [activeEcosystems, ecosystemId])

  const ecosystemOptions = useMemo(() => activeEcosystems.map((membership) => ({
    value: membership.ecosystemId,
    label: `${membership.ecosystemSlug} (${membership.role})`
  })), [activeEcosystems])

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Ecosystem' }]} />
      <PageHeader
        title="Hub Ecosystem"
        eyebrow="Ecosystem admin"
        tone="ecosystem"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge="Hub operativo"
        title="Operación ECOSYSTEM enfocada"
        description="Usá este hub para saltar a órdenes, productos o shipping del ecosystem activo sin mezclar tareas de store."
        tone="ecosystem"
      />

      <Section title="Ecosystems activos">
        <Card>
          {activeEcosystems.length === 0 ? (
            <EmptyState title="No hay ecosystems activos" description="Necesitás una membership activa para operar este dominio." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {activeEcosystems.map((membership) => (
                <div
                  key={membership.ecosystemId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: theme.spacing.lg,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: theme.spacing.lg,
                    borderRadius: theme.radius.md,
                    background: theme.colors.bgSurface,
                    border: `1px solid ${theme.colors.borderDefault}`
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{membership.ecosystemSlug}</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{membership.role}</div>
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>{membership.ecosystemId}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Capacidades disponibles">
        <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {operationalAreas.map((area) => (
            <Card key={area.href} variant="soft">
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                <div style={{ fontWeight: 700, color: theme.colors.textPrimary }}>{area.title}</div>
                <div style={{ color: theme.colors.textMuted }}>{area.description}</div>
                <div>
                  <Link to={area.href} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary">{area.cta}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Analytics MVP">
        <Card>
          {activeEcosystems.length === 0 ? (
            <EmptyState title="No hay ecosystems activos" description="Necesitás una membership activa para cargar analytics." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <SelectField value={ecosystemId} onChange={(event) => setEcosystemId(event.target.value)} options={ecosystemOptions} />
              <AnalyticsSummaryPanel
                title="ECOSYSTEM"
                description="Resumen administrativo simple sobre órdenes, fulfillments y productos externos del ecosystem seleccionado."
                loading={analytics.loading}
                error={analytics.error}
                onRetry={() => { void analytics.refetch().catch(() => undefined) }}
                summary={analytics.summary}
                activeProductsLabel="Productos externos activos"
                activeProductsValue={analytics.summary?.activeExternalProducts ?? 0}
                inactiveProductsLabel="Productos externos inactivos"
                inactiveProductsValue={analytics.summary?.inactiveExternalProducts ?? 0}
              />
            </div>
          )}
        </Card>
      </Section>

      <Section title="Reporting operativo MVP">
        <Card>
          {activeEcosystems.length === 0 ? (
            <EmptyState title="No hay ecosystems activos" description="Necesitás una membership activa para cargar reporting operativo." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <EcosystemOperationalReportPanel
                range={reportRange}
                onRangeChange={setReportRange}
                loading={operationalReport.loading}
                error={operationalReport.error}
                onRetry={() => { void operationalReport.refetch().catch(() => undefined) }}
                report={operationalReport.report}
              />
            </div>
          )}
        </Card>
      </Section>
    </AdminLayout>
  )
}
