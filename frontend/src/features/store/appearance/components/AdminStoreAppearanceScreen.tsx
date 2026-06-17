import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import type { StoreAppearancePalette, StoreAppearancePreset, StoreAppearanceShape } from '@/api/contracts/v1/storeAdmin'
import { theme } from '@/app/theme'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Section from '@/components/ui/Section'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import SelectField from '@/components/primitives/Select'
import { StorefrontRenderer, resolveStorefrontAppearance } from '@/features/public-store/appearance'

type AppearanceOption = {
  preset: StoreAppearancePreset
  title: string
  description: string
  preview: string
}

const APPEARANCE_OPTIONS: AppearanceOption[] = [
  {
    preset: 'MODERN',
    title: 'Moderna',
    description: 'Minimalista y enfocada en el contenido.',
    preview: 'Cabecera amplia, catálogo equilibrado y superficies livianas.'
  },
  {
    preset: 'CLASSIC',
    title: 'Clásica',
    description: 'Más compacta y tradicional.',
    preview: 'Secciones más definidas, bordes visibles y menor separación.'
  },
  {
    preset: 'LOCAL_BUSINESS',
    title: 'Negocio local',
    description: 'Prioriza contacto y confianza.',
    preview: 'Contacto más visible y vías de consulta cerca del inicio.'
  },
  {
    preset: 'PORTFOLIO',
    title: 'Portfolio',
    description: 'Destaca la presentación visual.',
    preview: 'Descripción y contenido primero, catálogo con menor protagonismo.'
  }
]

const PALETTE_OPTIONS: Array<{ value: StoreAppearancePalette; label: string }> = [
  { value: 'CORAL', label: 'Coral' },
  { value: 'OCEAN', label: 'Ocean' },
  { value: 'FOREST', label: 'Forest' },
  { value: 'GRAPHITE', label: 'Graphite' }
]

const SHAPE_OPTIONS: Array<{ value: StoreAppearanceShape; label: string }> = [
  { value: 'SQUARE', label: 'Square' },
  { value: 'ROUNDED', label: 'Rounded' },
  { value: 'SOFT', label: 'Soft' }
]

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'No se pudo completar la acción.'
}

export default function AdminStoreAppearanceScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStores = memberships.stores.filter((membership) => membership.status === 'ACTIVE')
  const [selectedPreset, setSelectedPreset] = useState<StoreAppearancePreset>('MODERN')
  const [savedPreset, setSavedPreset] = useState<StoreAppearancePreset>('MODERN')
  const [selectedPalette, setSelectedPalette] = useState<StoreAppearancePalette>('CORAL')
  const [savedPalette, setSavedPalette] = useState<StoreAppearancePalette>('CORAL')
  const [selectedShape, setSelectedShape] = useState<StoreAppearanceShape>('ROUNDED')
  const [savedShape, setSavedShape] = useState<StoreAppearanceShape>('ROUNDED')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadAppearance() {
      try {
        setLoading(true)
        setError(null)
        const data = await storeAdminAdapter.getStoreAppearance(authRequest)
        if (cancelled) return
        const resolved = resolveStorefrontAppearance({
          appearance: data.preset,
          palette: data.palette,
          shape: data.shape
        })
        setSelectedPreset(data.preset)
        setSavedPreset(data.preset)
        setSelectedPalette(resolved.palette)
        setSavedPalette(resolved.palette)
        setSelectedShape(resolved.shape)
        setSavedShape(resolved.shape)
      } catch (err) {
        if (!cancelled) setError(toErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAppearance()
    return () => {
      cancelled = true
    }
  }, [authRequest])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const data = await storeAdminAdapter.updateStoreAppearance({
        preset: selectedPreset,
        palette: selectedPalette,
        shape: selectedShape
      }, authRequest)
      const resolved = resolveStorefrontAppearance({
        appearance: data.preset,
        palette: data.palette ?? selectedPalette,
        shape: data.shape ?? selectedShape
      })
      setSelectedPreset(data.preset)
      setSavedPreset(data.preset)
      setSelectedPalette(resolved.palette)
      setSavedPalette(resolved.palette)
      setSelectedShape(resolved.shape)
      setSavedShape(resolved.shape)
      setSuccess('Apariencia guardada.')
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  const previewAppearance = useMemo(() => resolveStorefrontAppearance({
    appearance: selectedPreset,
    palette: selectedPalette,
    shape: selectedShape,
    branding: null,
    capabilities: ['ABOUT', 'PRODUCTS', 'PROMOTIONS', 'CONTACT'],
    profile: {
      description: 'Vista simple para comparar color y forma antes de guardar.'
    },
    catalog: {
      productsTotal: 3,
      categoriesCount: 2,
      promotionsCount: 1,
      hasCatalogFilters: false
    },
    contacts: {
      count: 2
    }
  }), [selectedPalette, selectedPreset, selectedShape])
  const hasChanges = selectedPreset !== savedPreset || selectedPalette !== savedPalette || selectedShape !== savedShape

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Apariencia' }]} />
      <PageHeader
        title="Apariencia"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge="Presets visuales"
        title="Hacé que tu tienda se sienta propia sin diseñar una web."
        description="Elegí una presentación cerrada y compatible con el sistema visual de Barmi. No cambia funciones, datos, SEO ni catálogo."
        tone="store"
      />

      <Section title="Store actual">
        <Card>
          {activeStores.length === 0 ? (
            <EmptyState title="No hay stores activas" description="Necesitas una membership activa para configurar apariencia." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {activeStores.map((membership) => (
                <div
                  key={membership.storeId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: theme.spacing.md,
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{membership.storeSlug}</div>
                    <div style={{ color: theme.colors.textMuted }}>{membership.role}</div>
                  </div>
                  <Badge variant="neutral">{membership.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Presets disponibles">
        <Card>
          {loading ? (
            <LoadingState label="Cargando apariencia..." />
          ) : error && !success ? (
            <ErrorState message={error} />
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
              {error ? <ErrorState message={error} /> : null}
              {success ? <div role="status" style={{ color: theme.colors.success, fontWeight: 700 }}>{success}</div> : null}

              <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                Elegí la forma general, la paleta cerrada y el nivel de redondez. No cambia tus productos, datos de contacto ni lo que tus clientes pueden hacer.
              </div>

              <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
                {APPEARANCE_OPTIONS.map((option) => {
                  const checked = selectedPreset === option.preset
                  return (
                    <label
                      key={option.preset}
                      style={{
                        display: 'grid',
                        gap: theme.spacing.md,
                        padding: theme.spacing.lg,
                        border: `1px solid ${checked ? theme.colors.actionPrimary : theme.colors.borderDefault}`,
                        borderRadius: theme.radius.md,
                        background: checked ? theme.colors.bgAccentSoft : theme.colors.bgSurface,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, fontWeight: 700 }}>
                          <input
                            type="radio"
                            name="appearance-preset"
                            aria-label={option.title}
                            checked={checked}
                            onChange={() => {
                              setSelectedPreset(option.preset)
                              setSuccess(null)
                            }}
                          />
                          {option.title}
                        </span>
                        {savedPreset === option.preset ? <Badge variant="success">Actual</Badge> : null}
                      </span>
                      <span style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>{option.description}</span>
                      <span
                        style={{
                          display: 'block',
                          padding: theme.spacing.md,
                          borderRadius: theme.radius.sm,
                          border: `1px solid ${theme.colors.borderDefault}`,
                          background: theme.colors.bgSurfaceAlt,
                          color: theme.colors.textSecondary,
                          lineHeight: 1.45
                        }}
                      >
                        {option.preview}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: theme.spacing.xs }}>Palette</div>
                  <SelectField
                    aria-label="Palette"
                    value={selectedPalette}
                    options={PALETTE_OPTIONS}
                    onChange={(event) => {
                      setSelectedPalette(event.target.value as StoreAppearancePalette)
                      setSuccess(null)
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: theme.spacing.xs }}>Shape</div>
                  <SelectField
                    aria-label="Shape"
                    value={selectedShape}
                    options={SHAPE_OPTIONS}
                    onChange={(event) => {
                      setSelectedShape(event.target.value as StoreAppearanceShape)
                      setSuccess(null)
                    }}
                  />
                </div>
              </div>

              <StorefrontRenderer
                appearance={previewAppearance}
                style={{
                  display: 'grid',
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                  borderRadius: 'var(--store-card-radius)',
                  border: `1px solid var(--store-border-accent, ${theme.colors.borderDefault})`,
                  background: `var(--store-surface-tint, ${theme.colors.bgSurfaceAlt})`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ color: 'var(--store-brand)', fontWeight: 700, fontSize: theme.typography.small.size, textTransform: 'uppercase' }}>
                      {previewAppearance.labels.storefrontEyebrow}
                    </div>
                    <div style={{ color: theme.colors.textPrimary, fontWeight: 800, fontSize: theme.typography.title.size }}>Vista de tienda</div>
                  </div>
                  <Badge variant="info">{selectedPalette}</Badge>
                </div>
                <div style={{ display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}>
                  <Card style={{ padding: theme.spacing.md }}>
                    <div style={{ fontWeight: 700 }}>Producto destacado</div>
                    <div style={{ color: theme.colors.textMuted }}>Card, badges y bordes.</div>
                  </Card>
                  <Card style={{ padding: theme.spacing.md }}>
                    <div style={{ fontWeight: 700 }}>Contacto</div>
                    <div style={{ color: 'var(--store-action)', fontWeight: 700 }}>Acción primaria</div>
                  </Card>
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  <Button type="button" variant="primary">Comprar</Button>
                  <Button type="button" variant="secondary">Contactar</Button>
                  <Badge variant="neutral">{selectedShape}</Badge>
                </div>
              </StorefrontRenderer>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link to={routes.adminStorePublish} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
                  Volver a publicar
                </Link>
                <Button type="submit" variant="primary" disabled={saving || !hasChanges}>
                  {saving ? 'Guardando...' : 'Guardar apariencia'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </Section>
    </AdminLayout>
  )
}
