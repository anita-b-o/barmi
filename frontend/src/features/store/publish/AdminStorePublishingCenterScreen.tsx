import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import type {
  StoreAppearancePreset,
  StoreCapability,
  StoreCapabilityPreset,
  StorePublicProfile,
  StoreReadiness
} from '@/api/contracts/v1/storeAdmin'
import { theme } from '@/app/theme'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Section from '@/components/ui/Section'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import { StoreReadinessChecklist } from '@/features/store/onboarding'
import { withPublicProfileCtas } from '@/features/store/components/profileRoutes'

type PublishSection = {
  title: string
  value: string
  detail: string
  href?: string
  cta?: string
  badge?: string
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'info'
}

type PublicSiteCapability = {
  capability: StoreCapability
  label: string
}

const publicSiteCapabilities: PublicSiteCapability[] = [
  { capability: 'ABOUT', label: 'Sobre nosotros' },
  { capability: 'CONTACT', label: 'Contacto' },
  { capability: 'PRODUCTS', label: 'Productos' },
  { capability: 'PROMOTIONS', label: 'Promociones' },
  { capability: 'CHECKOUT', label: 'Compras online' }
]

const appearanceLabels: Record<StoreAppearancePreset, string> = {
  MODERN: 'Moderna',
  CLASSIC: 'Clásica',
  LOCAL_BUSINESS: 'Negocio local',
  PORTFOLIO: 'Portfolio'
}

function sameCapabilities(left: StoreCapability[], right: StoreCapability[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((capability) => rightSet.has(capability))
}

function findCurrentPreset(presets: StoreCapabilityPreset[], enabled: StoreCapability[]) {
  return presets.find((preset) => sameCapabilities(preset.capabilities, enabled))
}

function isProfileComplete(profile: StorePublicProfile | null, readiness: StoreReadiness | null) {
  const publicSteps = readiness?.steps.filter((step) => step.capability === 'ABOUT' || step.capability === 'CONTACT') ?? []
  if (publicSteps.length > 0) return publicSteps.every((step) => step.completed)
  if (!profile) return false
  return Boolean(profile.publicDescription || profile.publicEmail || profile.publicPhone || profile.publicWhatsapp)
}

function PublishCenterSectionCard({ section }: { section: PublishSection }) {
  return (
    <Card variant="soft" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: theme.spacing.xs, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: theme.typography.h3.size, letterSpacing: 0 }}>{section.title}</h3>
            <div style={{ fontWeight: 700, color: theme.colors.textPrimary }}>{section.value}</div>
          </div>
          {section.badge ? <Badge variant={section.badgeVariant ?? 'neutral'}>{section.badge}</Badge> : null}
        </div>
        <p style={{ margin: 0, color: theme.colors.textMuted, lineHeight: 1.5 }}>{section.detail}</p>
        {section.href && section.cta ? (
          <div>
            <Link to={section.href} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">{section.cta}</Button>
            </Link>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function buildPublicStoreUrl(slug: string) {
  return new URL(routes.publicStore(slug), window.location.origin).toString()
}

type PublicSiteDashboardProps = {
  publicUrl: string | null
  publishReady: boolean
  enabledCapabilities: Set<StoreCapability>
}

function PublicSiteDashboard({ publicUrl, publishReady, enabledCapabilities }: PublicSiteDashboardProps) {
  const [copyFeedback, setCopyFeedback] = useState('')

  async function handleCopyLink() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopyFeedback('Enlace copiado')
  }

  return (
    <Section title="Tu sitio público">
      <Card>
        <div style={{ display: 'grid', gap: theme.spacing.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: theme.spacing.xs, minWidth: 0 }}>
              <div style={{ fontSize: theme.typography.caption.size, color: theme.colors.textMuted, fontWeight: 700 }}>
                URL pública actual
              </div>
              {publicUrl ? (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: theme.colors.brand, fontWeight: 700, overflowWrap: 'anywhere' }}
                >
                  {publicUrl}
                </a>
              ) : (
                <p style={{ margin: 0, color: theme.colors.textMuted, lineHeight: 1.5 }}>
                  Todavía no hay un slug público disponible para esta store.
                </p>
              )}
            </div>
            <Badge variant={publishReady ? 'success' : 'warning'}>
              {publishReady ? 'Publicado' : 'Faltan pasos para publicar'}
            </Badge>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                    padding: '11px 16px',
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.borderDefault}`,
                    background: theme.colors.bgSurfaceAlt,
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.label.size,
                    fontWeight: 600,
                    letterSpacing: 0,
                    textAlign: 'center'
                  }}
                >
                  Abrir sitio público
                </span>
              </a>
            ) : null}
            <Button type="button" variant="secondary" onClick={handleCopyLink} disabled={!publicUrl}>
              Copiar enlace
            </Button>
          </div>
          <div role="status" aria-live="polite" style={{ minHeight: 20, color: theme.colors.success, fontWeight: 700 }}>
            {copyFeedback}
          </div>

          <div style={{ display: 'grid', gap: theme.spacing.sm }}>
            <h3 style={{ margin: 0, fontSize: theme.typography.h3.size, letterSpacing: 0 }}>Secciones visibles</h3>
            <div style={{ display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {publicSiteCapabilities.map((item) => {
                const enabled = enabledCapabilities.has(item.capability)
                return (
                  <div
                    key={item.capability}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      padding: theme.spacing.sm,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      borderRadius: theme.radius.md,
                      background: theme.colors.bgSurfaceAlt
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{item.label}</span>
                    <Badge variant={enabled ? 'success' : 'neutral'}>{enabled ? 'Visible' : 'Oculto'}</Badge>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>
    </Section>
  )
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'No se pudo cargar el centro de publicación.'
}

export default function AdminStorePublishingCenterScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const [readiness, setReadiness] = useState<StoreReadiness | null>(null)
  const [enabledCapabilities, setEnabledCapabilities] = useState<StoreCapability[]>([])
  const [presets, setPresets] = useState<StoreCapabilityPreset[]>([])
  const [appearancePreset, setAppearancePreset] = useState<StoreAppearancePreset | null>(null)
  const [profile, setProfile] = useState<StorePublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadPublishingCenter() {
      try {
        setLoading(true)
        setError(null)
        const [readinessData, capabilitiesData, presetsData, appearanceData, profileData] = await Promise.all([
          storeAdminAdapter.getStoreReadiness(authRequest),
          storeAdminAdapter.getStoreCapabilities(authRequest),
          storeAdminAdapter.listStoreCapabilityPresets(authRequest),
          storeAdminAdapter.getStoreAppearance(authRequest),
          storeAdminAdapter.getStorePublicProfile(authRequest)
        ])
        if (cancelled) return
        setReadiness(readinessData)
        setEnabledCapabilities(capabilitiesData.enabled)
        setPresets(presetsData.presets)
        setAppearancePreset(appearanceData.preset)
        setProfile(profileData)
      } catch (err) {
        if (!cancelled) setError(toErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPublishingCenter()
    return () => {
      cancelled = true
    }
  }, [authRequest])

  const currentPreset = useMemo(() => findCurrentPreset(presets, enabledCapabilities), [enabledCapabilities, presets])
  const readinessForDisplay = withPublicProfileCtas(readiness)
  const publicInfoComplete = isProfileComplete(profile, readiness)
  const capabilitySet = useMemo(() => new Set(enabledCapabilities), [enabledCapabilities])
  const activeStoreSlug = memberships.stores.find((membership) => membership.status === 'ACTIVE')?.storeSlug
  const previewRoute = readiness?.steps.find((step) => step.ctaRoute?.startsWith('/public/'))?.ctaRoute ?? null
  const publicStoreHref = previewRoute ?? (activeStoreSlug ? routes.publicStore(activeStoreSlug) : null)
  const publicSiteUrl = activeStoreSlug ? buildPublicStoreUrl(activeStoreSlug) : null

  const sections: PublishSection[] = [
    {
      title: 'Tipo de sitio',
      value: currentPreset?.name ?? 'Personalizado',
      detail: currentPreset?.description ?? 'La tienda usa una combinación personalizada de partes visibles.',
      href: routes.adminStoreModules,
      cta: 'Editar'
    },
    {
      title: 'Apariencia',
      value: appearancePreset ? appearanceLabels[appearancePreset] : 'Sin cargar',
      detail: 'Preset visual aplicado a la presencia pública.',
      href: routes.adminStoreAppearance,
      cta: 'Editar'
    },
    {
      title: 'Información pública',
      value: publicInfoComplete ? 'Completado' : 'Pendiente',
      detail: 'Descripción y datos de contacto que aparecen en el sitio público.',
      href: routes.adminStoreProfile,
      cta: 'Editar',
      badge: publicInfoComplete ? 'Completado' : 'Pendiente',
      badgeVariant: publicInfoComplete ? 'success' : 'warning'
    }
  ]

  if (capabilitySet.has('PRODUCTS')) {
    sections.push({
      title: 'Productos',
      value: 'Aplica a este sitio',
      detail: 'Catálogo administrable para la tienda actual.',
      href: routes.adminStoreProducts,
      cta: 'Administrar productos'
    })
  }

  if (capabilitySet.has('SHIPPING')) {
    sections.push({
      title: 'Envíos',
      value: 'Aplica a este sitio',
      detail: 'Cobertura y costos de envío configurados en la pantalla existente.',
      href: routes.adminShippingZones,
      cta: 'Configurar envíos'
    })
  }

  if (capabilitySet.has('PROMOTIONS')) {
    sections.push({
      title: 'Promociones',
      value: 'Opcional',
      detail: 'Puede sumar al progreso cuando está habilitado, pero no bloquea la publicación.',
      href: routes.adminStorePromotions,
      cta: 'Gestionar promociones',
      badge: 'No bloqueante',
      badgeVariant: 'info'
    })
  }

  sections.push({
    title: 'Tienda pública',
    value: readiness?.publishReady ? 'Lista para abrir' : 'Vista previa disponible',
    detail: publicStoreHref
      ? readiness?.publishReady
        ? 'Abrí tu sitio como lo ve un cliente.'
        : 'Podés revisar cómo se ve mientras terminás los pasos pendientes.'
      : 'Cuando tengas una store activa, vas a poder abrir el sitio público desde acá.',
    href: publicStoreHref ?? undefined,
    cta: publicStoreHref ? (readiness?.publishReady ? 'Abrir sitio público' : 'Ver vista previa') : undefined,
    badge: publicStoreHref ? (readiness?.publishReady ? 'Público' : 'Preview') : 'Falta store activa',
    badgeVariant: publicStoreHref ? (readiness?.publishReady ? 'success' : 'info') : 'warning'
  })

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Publicar sitio' }]} />
      <PageHeader
        title="Prepará tu sitio"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge={readiness?.publishReady ? 'Lista' : 'Pendiente'}
        title="Prepará tu sitio"
        description="Completá estos pasos para publicar tu presencia digital."
        tone="store"
      />

      <Section title="Resumen">
        <Card>
          {loading ? <LoadingState label="Revisando publicación..." /> : null}
          {error ? <ErrorState message={error} /> : null}
          {readinessForDisplay ? <StoreReadinessChecklist readiness={readinessForDisplay} compact /> : null}
        </Card>
      </Section>

      {!loading && !error ? (
        <>
          <PublicSiteDashboard
            publicUrl={publicSiteUrl}
            publishReady={Boolean(readiness?.publishReady)}
            enabledCapabilities={capabilitySet}
          />

          <Section title="Pasos para publicar">
            <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {sections.map((section) => (
                <PublishCenterSectionCard key={section.title} section={section} />
              ))}
            </div>
          </Section>

          <Section title="Más adelante">
            <Card variant="soft" style={{ boxShadow: 'none' }}>
              <p style={{ margin: 0, color: theme.colors.textMuted, lineHeight: 1.5 }}>
                Blog, galería y reservas están pensados para una etapa posterior. No bloquean la publicación de este sitio.
              </p>
            </Card>
          </Section>
        </>
      ) : null}
    </AdminLayout>
  )
}
