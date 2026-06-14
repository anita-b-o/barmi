import { Link } from 'react-router-dom'
import { FormEvent, useEffect, useState } from 'react'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth/authContext'
import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import Select from '@/components/primitives/Select'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Badge from '@/components/primitives/Badge'
import Field from '@/components/forms/Field'
import { theme } from '@/app/theme'
import { AnalyticsSummaryPanel, StoreOperationalReportPanel, useStoreAnalyticsSummary, useStoreOperationalReport } from '@/features/analytics'
import { storeAdminAdapter } from '../../../api/adapters/storeAdminAdapter'
import type { StoreOperationalReportRange } from '@/api/contracts/v1/storeAdmin'

const operationalAreas = [
  {
    title: 'Órdenes',
    description: 'Revisá órdenes pendientes, consultá estados finales y entrá al detalle operativo de cada pedido.',
    href: routes.adminOrders,
    cta: 'Abrir órdenes'
  },
  {
    title: 'Fulfillments',
    description: 'Continuá la operación logística desde el listado de fulfillments y sus cambios de estado.',
    href: routes.adminFulfillments,
    cta: 'Abrir fulfillments'
  },
  {
    title: 'Miembros',
    description: 'Invita miembros, ajusta roles y administra accesos del backoffice store.',
    href: routes.adminMembers,
    cta: 'Gestionar miembros'
  },
  {
    title: 'Productos',
    description: 'Administra el catálogo store con altas, edición y desactivación sobre la store actual.',
    href: routes.adminStoreProducts,
    cta: 'Gestionar productos'
  },
  {
    title: 'Módulos de tienda',
    description: 'Elegí qué módulos preparar para la presencia pública de esta store.',
    href: routes.adminStoreModules,
    cta: 'Configurar módulos'
  },
  {
    title: 'Analytics',
    description: 'Entrá al módulo de analytics con tabs de producto y ventas.',
    href: routes.adminStoreAnalytics,
    cta: 'Abrir analytics'
  },
  {
    title: 'Promociones',
    description: 'Creá cupones simples, activalos o desactivalos y controlá su uso operativo desde admin.',
    href: routes.adminStorePromotions,
    cta: 'Gestionar promociones'
  },
  {
    title: 'Zonas de envío',
    description: 'Configurá cobertura y costos de envío desde la pantalla específica de zonas.',
    href: routes.adminShippingZones,
    cta: 'Gestionar zonas'
  }
]

export default function AdminStoreScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStores = memberships.stores.filter((membership) => membership.status === 'ACTIVE')
  const analytics = useStoreAnalyticsSummary()
  const [reportRange, setReportRange] = useState<StoreOperationalReportRange>('7d')
  const report = useStoreOperationalReport(reportRange)
  const [discoveryLoading, setDiscoveryLoading] = useState(true)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [discoverySuccess, setDiscoverySuccess] = useState<string | null>(null)
  const [savingDiscovery, setSavingDiscovery] = useState(false)
  const [actorRole, setActorRole] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [ecosystemId, setEcosystemId] = useState('')
  const [publicCategoryKey, setPublicCategoryKey] = useState('')
  const [publicLocationLabel, setPublicLocationLabel] = useState('')
  const [publicLatitude, setPublicLatitude] = useState('')
  const [publicLongitude, setPublicLongitude] = useState('')
  const [ecosystemOptions, setEcosystemOptions] = useState<Array<{ value: string; label: string }>>([])
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    let cancelled = false
    const loadDiscovery = async () => {
      try {
        setDiscoveryLoading(true)
        setDiscoveryError(null)
        const data = await storeAdminAdapter.getDiscoverySettings(authRequest)
        if (cancelled) return
        setActorRole(data.actorRole)
        setStoreSlug(data.storeSlug)
        setEcosystemId(data.ecosystem?.id ?? '')
        setPublicCategoryKey(data.publicCategoryKey ?? '')
        setPublicLocationLabel(data.publicLocationLabel ?? '')
        setPublicLatitude(data.publicLatitude === null ? '' : String(data.publicLatitude))
        setPublicLongitude(data.publicLongitude === null ? '' : String(data.publicLongitude))
        setEcosystemOptions([
          { value: '', label: 'Sin ecosystem asociado' },
          ...data.ecosystems.map((item) => ({ value: item.id, label: `${item.name} (${item.slug})` }))
        ])
        setCategoryOptions([
          { value: '', label: 'Sin categoría pública' },
          ...data.categories.map((item) => ({ value: item.key, label: item.label }))
        ])
      } catch (error) {
        if (cancelled) return
        setDiscoveryError(error instanceof Error ? error.message : 'No se pudo cargar la configuración pública de discovery.')
      } finally {
        if (!cancelled) setDiscoveryLoading(false)
      }
    }
    void loadDiscovery()
    return () => {
      cancelled = true
    }
  }, [authRequest])

  const canEditDiscovery = actorRole === 'OWNER'

  const handleDiscoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSavingDiscovery(true)
      setDiscoveryError(null)
      setDiscoverySuccess(null)
      const data = await storeAdminAdapter.updateDiscoverySettings({
        ecosystemId: ecosystemId || null,
        publicCategoryKey: publicCategoryKey || null,
        publicLocationLabel: publicLocationLabel || null,
        publicLatitude: publicLatitude === '' ? null : Number(publicLatitude),
        publicLongitude: publicLongitude === '' ? null : Number(publicLongitude)
      }, authRequest)
      setActorRole(data.actorRole)
      setStoreSlug(data.storeSlug)
      setEcosystemId(data.ecosystem?.id ?? '')
      setPublicCategoryKey(data.publicCategoryKey ?? '')
      setPublicLocationLabel(data.publicLocationLabel ?? '')
      setPublicLatitude(data.publicLatitude === null ? '' : String(data.publicLatitude))
      setPublicLongitude(data.publicLongitude === null ? '' : String(data.publicLongitude))
      setDiscoverySuccess('Discovery público actualizado.')
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : 'No se pudo guardar la configuración pública.')
    } finally {
      setSavingDiscovery(false)
    }
  }

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store' }]} />
      <PageHeader
        title="Hub Store"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge="Hub operativo"
        title="Operación STORE sin desvíos"
        description="Entrá a órdenes, fulfillments, miembros o shipping según la tarea. Este hub evita duplicar CRUDs y deja cada flujo en su pantalla natural."
        tone="store"
      />

      <Section title="Stores activas">
        <Card>
          {activeStores.length === 0 ? (
            <EmptyState title="No hay stores activas" description="Necesitas una membership activa para operar este dominio." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {activeStores.map((membership) => (
                <div
                  key={membership.storeId}
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
                    <div style={{ fontWeight: 600 }}>{membership.storeSlug}</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{membership.role}</div>
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>{membership.storeId}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Discovery público">
        <Card>
          {discoveryLoading ? (
            <LoadingState label="Cargando configuración pública de discovery..." />
          ) : discoveryError && !storeSlug ? (
            <ErrorState message={discoveryError} />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>Store actual: {storeSlug || activeStores[0]?.storeSlug || 'store actual'}</div>
                  <div style={{ color: theme.colors.textMuted }}>
                    Estos campos alimentan directamente la Home pública del ecosystem y el mapa/listado público de stores.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  <Badge variant={canEditDiscovery ? 'success' : 'neutral'}>
                    {canEditDiscovery ? 'OWNER puede editar' : `${actorRole || 'Sin rol'} sólo lectura`}
                  </Badge>
                </div>
              </div>

              {discoveryError ? <ErrorState message={discoveryError} /> : null}
              {discoverySuccess ? <div style={{ color: theme.colors.success, fontWeight: 600 }}>{discoverySuccess}</div> : null}
              {!canEditDiscovery ? (
                <div style={{ color: theme.colors.textMuted }}>
                  La edición de asociación a ecosystem y metadatos públicos de discovery queda restringida a `OWNER` para evitar cambios operativos sensibles desde roles menores.
                </div>
              ) : null}

              <form onSubmit={handleDiscoverySubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
                <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                  <Field
                    label="Ecosystem asociado"
                    helpText="Define en qué Home y mapa público de ecosystem aparece esta store."
                  >
                    <Select
                      aria-label="Ecosystem asociado"
                      value={ecosystemId}
                      onChange={(event) => setEcosystemId(event.target.value)}
                      options={ecosystemOptions}
                      disabled={!canEditDiscovery}
                    />
                  </Field>

                  <Field
                    label="Categoría pública principal"
                    helpText="Se usa en filtros públicos del mapa/listado. No afecta categorías de productos."
                  >
                    <Select
                      aria-label="Categoría pública principal"
                      value={publicCategoryKey}
                      onChange={(event) => setPublicCategoryKey(event.target.value)}
                      options={categoryOptions}
                      disabled={!canEditDiscovery}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gap: theme.spacing.lg }}>
                  <div style={{ fontWeight: 700 }}>Ubicación pública para discovery</div>
                  <div style={{ color: theme.colors.textMuted }}>
                    El label puede mostrarse en listado aunque no haya coordenadas. Si cargás latitud y longitud, la store entra al mapa público.
                  </div>
                  <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <Field
                      label="Label de ubicación pública"
                      helpText="Ejemplo: Palermo, CABA o La Plata Centro."
                    >
                      <Input
                        aria-label="Label de ubicación pública"
                        value={publicLocationLabel}
                        onChange={(event) => setPublicLocationLabel(event.target.value)}
                        placeholder="Palermo, CABA"
                        disabled={!canEditDiscovery}
                      />
                    </Field>

                    <Field
                      label="Latitud pública"
                      helpText="Usá formato decimal. Si completás una coordenada, completá ambas."
                    >
                      <Input
                        aria-label="Latitud pública"
                        type="number"
                        step="0.000001"
                        value={publicLatitude}
                        onChange={(event) => setPublicLatitude(event.target.value)}
                        placeholder="-34.588921"
                        disabled={!canEditDiscovery}
                      />
                    </Field>

                    <Field
                      label="Longitud pública"
                      helpText="Usá formato decimal. El mapa público depende de este par de coordenadas."
                    >
                      <Input
                        aria-label="Longitud pública"
                        type="number"
                        step="0.000001"
                        value={publicLongitude}
                        onChange={(event) => setPublicLongitude(event.target.value)}
                        placeholder="-58.430169"
                        disabled={!canEditDiscovery}
                      />
                    </Field>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  <Button type="submit" disabled={!canEditDiscovery || savingDiscovery}>
                    {savingDiscovery ? 'Guardando...' : 'Guardar discovery público'}
                  </Button>
                </div>
              </form>
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
        <AnalyticsSummaryPanel
          title="STORE"
          description="Resumen administrativo simple sobre órdenes, fulfillments y productos de la store actual."
          loading={analytics.loading}
          error={analytics.error}
          onRetry={() => { void analytics.refetch().catch(() => undefined) }}
          summary={analytics.summary}
          activeProductsLabel="Productos activos"
          activeProductsValue={analytics.summary?.activeProducts ?? 0}
          inactiveProductsLabel="Productos inactivos"
          inactiveProductsValue={analytics.summary?.inactiveProducts ?? 0}
        />
      </Section>

      <Section title="Reporting operativo MVP">
        <StoreOperationalReportPanel
          range={reportRange}
          onRangeChange={setReportRange}
          loading={report.loading}
          error={report.error}
          onRetry={() => { void report.refetch().catch(() => undefined) }}
          report={report.report}
        />
      </Section>
    </AdminLayout>
  )
}
