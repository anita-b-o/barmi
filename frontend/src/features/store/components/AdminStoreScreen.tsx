import { Link } from 'react-router-dom'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { StoreReadiness } from '@/api/contracts/v1/storeAdmin'
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
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [publicDescription, setPublicDescription] = useState('')
  const [publicEmail, setPublicEmail] = useState('')
  const [publicPhone, setPublicPhone] = useState('')
  const [publicWhatsapp, setPublicWhatsapp] = useState('')
  const [readiness, setReadiness] = useState<StoreReadiness | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(true)
  const [readinessError, setReadinessError] = useState<string | null>(null)

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

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      try {
        setProfileLoading(true)
        setProfileError(null)
        const data = await storeAdminAdapter.getStorePublicProfile(authRequest)
        if (cancelled) return
        setPublicDescription(data.publicDescription ?? '')
        setPublicEmail(data.publicEmail ?? '')
        setPublicPhone(data.publicPhone ?? '')
        setPublicWhatsapp(data.publicWhatsapp ?? '')
      } catch (error) {
        if (!cancelled) setProfileError(error instanceof Error ? error.message : 'No se pudo cargar la información pública.')
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [authRequest])

  const canEditDiscovery = actorRole === 'OWNER'
  const onboardingTitle = readinessTitle(readiness)

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

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSavingProfile(true)
      setProfileError(null)
      setProfileSuccess(null)
      const data = await storeAdminAdapter.updateStorePublicProfile({
        publicDescription: publicDescription || null,
        publicEmail: publicEmail || null,
        publicPhone: publicPhone || null,
        publicWhatsapp: publicWhatsapp || null
      }, authRequest)
      setPublicDescription(data.publicDescription ?? '')
      setPublicEmail(data.publicEmail ?? '')
      setPublicPhone(data.publicPhone ?? '')
      setPublicWhatsapp(data.publicWhatsapp ?? '')
      setProfileSuccess('Información pública guardada.')
      await loadReadiness()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'No se pudo guardar la información pública.')
    } finally {
      setSavingProfile(false)
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

      <Section
        title={onboardingTitle}
        action={(
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Link to={routes.adminStoreModules} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Elegir tipo de sitio</Button>
            </Link>
            <Link to={routes.adminStoreOnboarding} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Ver pasos</Button>
            </Link>
          </div>
        )}
      >
        <Card>
          {readinessLoading ? <LoadingState label="Revisando tu tienda..." /> : null}
          {readinessError ? <ErrorState message={readinessError} /> : null}
          {readiness ? <StoreReadinessChecklist readiness={readiness} compact /> : null}
        </Card>
      </Section>

      <Section title="Información pública">
        <Card>
          {profileLoading ? (
            <LoadingState label="Cargando información pública..." />
          ) : profileError && !profileSuccess ? (
            <ErrorState message={profileError} />
          ) : null}

          {!profileLoading ? (
            <form onSubmit={handleProfileSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                Estos datos se muestran en tu tienda pública cuando las secciones Sobre tu negocio y Contacto están activas.
              </div>
              {profileError && profileSuccess ? <ErrorState message={profileError} /> : null}
              {profileSuccess ? <div role="status" style={{ color: theme.colors.success, fontWeight: 600 }}>{profileSuccess}</div> : null}

              <Field
                label="Descripción de tu negocio"
                helpText="Contá qué hacés, a quién atendés o qué te diferencia. Máximo 1000 caracteres."
              >
                <textarea
                  aria-label="Descripción de tu negocio"
                  value={publicDescription}
                  onChange={(event) => setPublicDescription(event.target.value)}
                  maxLength={1000}
                  rows={5}
                  placeholder="Ej. Peluquería de barrio con cortes, color y atención por WhatsApp."
                  style={{
                    width: '100%',
                    minHeight: 132,
                    padding: '11px 14px',
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.borderDefault}`,
                    background: theme.colors.bgSurfaceAlt,
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.fontFamily,
                    fontSize: theme.typography.body.size,
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </Field>

              <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <Field label="Email público" helpText="Para consultas de clientes.">
                  <Input
                    aria-label="Email público"
                    type="email"
                    value={publicEmail}
                    maxLength={160}
                    onChange={(event) => setPublicEmail(event.target.value)}
                    placeholder="contacto@tutienda.com"
                  />
                </Field>
                <Field label="Teléfono público" helpText="Puede ser fijo o celular.">
                  <Input
                    aria-label="Teléfono público"
                    value={publicPhone}
                    maxLength={160}
                    onChange={(event) => setPublicPhone(event.target.value)}
                    placeholder="221 555 0101"
                  />
                </Field>
                <Field label="WhatsApp" helpText="Escribilo como querés que lo vea tu cliente.">
                  <Input
                    aria-label="WhatsApp"
                    value={publicWhatsapp}
                    maxLength={160}
                    onChange={(event) => setPublicWhatsapp(event.target.value)}
                    placeholder="+54 9 221 555 0101"
                  />
                </Field>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Guardando...' : 'Guardar información pública'}
                </Button>
              </div>
            </form>
          ) : null}
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
