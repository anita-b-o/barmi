import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import type { StoreAppearancePreset } from '@/api/contracts/v1/storeAdmin'
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

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'No se pudo completar la acción.'
}

export default function AdminStoreAppearanceScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStores = memberships.stores.filter((membership) => membership.status === 'ACTIVE')
  const [selectedPreset, setSelectedPreset] = useState<StoreAppearancePreset>('MODERN')
  const [savedPreset, setSavedPreset] = useState<StoreAppearancePreset>('MODERN')
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
        setSelectedPreset(data.preset)
        setSavedPreset(data.preset)
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
      const data = await storeAdminAdapter.updateStoreAppearance({ preset: selectedPreset }, authRequest)
      setSelectedPreset(data.preset)
      setSavedPreset(data.preset)
      setSuccess('Apariencia guardada.')
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

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
                Preview textual: estos presets ajustan jerarquía, spacing y superficies usando los mismos tokens. No agregan colores, fuentes ni plantillas por tienda.
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

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link to={routes.adminStore} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>
                  Volver al hub
                </Link>
                <Button type="submit" variant="primary" disabled={saving || selectedPreset === savedPreset}>
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
