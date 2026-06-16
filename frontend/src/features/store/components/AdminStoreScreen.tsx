import { Link } from 'react-router-dom'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { StoreCapabilities, StoreCapabilityPresetKey, StorePublicProfile, StoreReadiness } from '@/api/contracts/v1/storeAdmin'
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
import { StoreReadinessChecklist } from '@/features/store/onboarding'
import { readinessTitle } from '@/features/store/onboarding/readinessProfile'
import StorePublicProfileForm from './StorePublicProfileForm'
import { withPublicProfileCtas } from './profileRoutes'

const firstRunPresetOptions: Array<{ label: string; preset: StoreCapabilityPresetKey }> = [
  { label: 'Tienda online', preset: 'ONLINE_STORE' },
  { label: 'Servicios', preset: 'SERVICES' },
  { label: 'Portfolio', preset: 'PORTFOLIO' },
  { label: 'Página simple', preset: 'SIMPLE_PAGE' }
]

function hasPublicProfileComplete(profile: StorePublicProfile | null) {
  if (!profile) return false
  const hasDescription = Boolean(profile.publicDescription?.trim())
  const hasContact = Boolean(profile.publicEmail?.trim() || profile.publicPhone?.trim() || profile.publicWhatsapp?.trim())
  return hasDescription && hasContact
}

function hasConfiguredCapabilities(capabilities: StoreCapabilities | null, readiness: StoreReadiness | null) {
  return (capabilities?.enabled.length ?? readiness?.enabledCapabilities.length ?? 0) > 0
}

function shouldShowFirstRunExperience(
  readiness: StoreReadiness | null,
  profile: StorePublicProfile | null,
  capabilities: StoreCapabilities | null,
  productCount: number | null
) {
  if (!readiness || productCount === null) return false
  return readiness.score < 20 &&
    productCount === 0 &&
    !hasPublicProfileComplete(profile) &&
    !hasConfiguredCapabilities(capabilities, readiness)
}

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
    title: 'Partes de tu tienda',
    description: 'Elegí qué querés mostrar en tu tienda pública.',
    href: routes.adminStoreModules,
    cta: 'Editar partes'
  },
  {
    title: 'Apariencia',
    description: 'Elegí una presentación visual simple para que la tienda se sienta propia sin editar diseño.',
    href: routes.adminStoreAppearance,
    cta: 'Elegir preset'
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
  const [readiness, setReadiness] = useState<StoreReadiness | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(true)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [publicProfile, setPublicProfile] = useState<StorePublicProfile | null>(null)
  const [storeCapabilities, setStoreCapabilities] = useState<StoreCapabilities | null>(null)
  const [firstRunLoading, setFirstRunLoading] = useState(true)
  const [firstRunError, setFirstRunError] = useState<string | null>(null)
  const [firstRunSuccess, setFirstRunSuccess] = useState(false)
  const [applyingFirstRunPreset, setApplyingFirstRunPreset] = useState<StoreCapabilityPresetKey | null>(null)

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

  const loadReadiness = useCallback(async (cancelled?: () => boolean) => {
    try {
      setReadinessLoading(true)
      setReadinessError(null)
      const data = await storeAdminAdapter.getStoreReadiness(authRequest)
      if (!cancelled?.()) setReadiness(data)
    } catch (error) {
      if (!cancelled?.()) setReadinessError(error instanceof Error ? error.message : 'No se pudo cargar el estado para publicar tu tienda.')
    } finally {
      if (!cancelled?.()) setReadinessLoading(false)
    }
  }, [authRequest])

  useEffect(() => {
    let cancelled = false
    void loadReadiness(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [loadReadiness])

  const loadFirstRunData = useCallback(async (cancelled?: () => boolean) => {
    try {
      setFirstRunLoading(true)
      setFirstRunError(null)
      const [profileData, capabilitiesData] = await Promise.all([
        storeAdminAdapter.getStorePublicProfile(authRequest),
        storeAdminAdapter.getStoreCapabilities(authRequest)
      ])
      if (cancelled?.()) return
      setPublicProfile(profileData)
      setStoreCapabilities(capabilitiesData)
    } catch (error) {
      if (!cancelled?.()) setFirstRunError(error instanceof Error ? error.message : 'No se pudo preparar el onboarding inicial.')
    } finally {
      if (!cancelled?.()) setFirstRunLoading(false)
    }
  }, [authRequest])

  useEffect(() => {
    let cancelled = false
    void loadFirstRunData(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [loadFirstRunData])

  const canEditDiscovery = actorRole === 'OWNER'
  const readinessForDisplay = withPublicProfileCtas(readiness)
  const onboardingTitle = readinessTitle(readiness)
  const totalProducts = analytics.summary ? analytics.summary.activeProducts + analytics.summary.inactiveProducts : null
  const showFirstRunExperience = !firstRunLoading && shouldShowFirstRunExperience(readiness, publicProfile, storeCapabilities, totalProducts)
  const showFirstRunCard = showFirstRunExperience || firstRunSuccess || firstRunError

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

  const handleFirstRunPreset = async (preset: StoreCapabilityPresetKey) => {
    try {
      setApplyingFirstRunPreset(preset)
      setFirstRunError(null)
      const data = await storeAdminAdapter.applyStoreCapabilityPreset(preset, authRequest)
      setStoreCapabilities(data)
      setFirstRunSuccess(true)
      void loadReadiness().catch(() => undefined)
    } catch (error) {
      setFirstRunError(error instanceof Error ? error.message : 'No se pudo aplicar el tipo de sitio.')
    } finally {
      setApplyingFirstRunPreset(null)
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

      {showFirstRunCard ? (
        <Section title="Primeros pasos">
          <Card
            style={{
              borderColor: theme.colors.actionPrimary,
              background: theme.colors.bgSurfaceAlt
            }}
          >
            {firstRunSuccess ? (
              <div style={{ display: 'grid', gap: theme.spacing.lg }}>
                <div role="status" style={{ fontSize: theme.typography.h3.size, fontWeight: 700, letterSpacing: 0 }}>
                  Perfecto. Ahora vamos a preparar tu sitio.
                </div>
                <div>
                  <Link to={routes.adminStorePublish} style={{ textDecoration: 'none' }}>
                    <Button variant="primary">Ir a publicar sitio</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: theme.spacing.lg }}>
                <div style={{ display: 'grid', gap: theme.spacing.xs }}>
                  <h2 style={{ margin: 0, fontSize: theme.typography.h2.size, letterSpacing: 0 }}>
                    ¿Qué querés crear?
                  </h2>
                  <div style={{ color: theme.colors.textMuted }}>
                    Elegí el punto de partida y seguimos con publicación.
                  </div>
                </div>
                {firstRunError ? <ErrorState message={firstRunError} /> : null}
                <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  {firstRunPresetOptions.map((option) => {
                    const isApplying = applyingFirstRunPreset === option.preset
                    return (
                      <Button
                        key={option.preset}
                        type="button"
                        variant="secondary"
                        onClick={() => void handleFirstRunPreset(option.preset)}
                        disabled={applyingFirstRunPreset !== null}
                        aria-busy={isApplying}
                      >
                        {isApplying ? 'Aplicando...' : option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </Section>
      ) : null}

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

      <Section
        title={onboardingTitle}
        action={(
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Link to={routes.adminStoreModules} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Elegir tipo de sitio</Button>
            </Link>
            <Link to={routes.adminStorePublish} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Publicar sitio</Button>
            </Link>
          </div>
        )}
      >
        <Card>
          {readinessLoading ? <LoadingState label="Revisando tu tienda..." /> : null}
          {readinessError ? <ErrorState message={readinessError} /> : null}
          {readinessForDisplay ? <StoreReadinessChecklist readiness={readinessForDisplay} compact /> : null}
        </Card>
      </Section>

      <Section title="Información pública">
        <div id="public-profile" />
        <Card>
          <StorePublicProfileForm
            authRequest={authRequest}
            onSaved={() => {
              void loadReadiness()
              void loadFirstRunData()
            }}
          />
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

      <Section title="Accesos de tu tienda">
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
