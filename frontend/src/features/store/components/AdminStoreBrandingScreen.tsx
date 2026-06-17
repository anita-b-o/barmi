import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import type { StoreBranding } from '@/api/contracts/v1/storeAdmin'
import { theme } from '@/app/theme'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import Field from '@/components/forms/Field'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import { normalizeStoreBranding, storeBrandingCssVariables } from '@/features/store/branding'

const emptyBranding: StoreBranding = {
  logoUrl: null,
  bannerUrl: null,
  primaryColor: theme.colors.actionPrimary,
  secondaryColor: theme.colors.actionHover
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'No se pudo completar la acción.'
}

export default function AdminStoreBrandingScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStore = memberships.stores.find((membership) => membership.status === 'ACTIVE')
  const [form, setForm] = useState<StoreBranding>(emptyBranding)
  const [saved, setSaved] = useState<StoreBranding>(emptyBranding)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const previewBranding = useMemo(() => normalizeStoreBranding(form), [form])

  useEffect(() => {
    let cancelled = false
    async function loadBranding() {
      try {
        setLoading(true)
        setError(null)
        const data = await storeAdminAdapter.getStoreBranding(authRequest)
        if (cancelled) return
        setForm(data)
        setSaved(data)
      } catch (err) {
        if (!cancelled) setError(toErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadBranding()
    return () => {
      cancelled = true
    }
  }, [authRequest])

  const updateField = (key: keyof StoreBranding, value: string) => {
    setSuccess(null)
    setForm((current) => ({
      ...current,
      [key]: key === 'logoUrl' || key === 'bannerUrl' ? value : value.toUpperCase()
    }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const payload: StoreBranding = {
        logoUrl: form.logoUrl?.trim() || null,
        bannerUrl: form.bannerUrl?.trim() || null,
        primaryColor: form.primaryColor.trim(),
        secondaryColor: form.secondaryColor.trim()
      }
      const data = await storeAdminAdapter.updateStoreBranding(payload, authRequest)
      setForm(data)
      setSaved(data)
      setSuccess('Marca guardada.')
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Marca' }]} />
      <PageHeader
        title="Marca"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge="Brand kit MVP"
        title="Personalizá tu marca sin cambiar la arquitectura."
        description="Logo, portada y dos colores seguros para que la tienda pública se sienta propia sin CSS custom ni editor visual."
        tone="store"
      />

      <Section
        title="Branding básico"
        action={(
          <Link to={routes.adminStore} style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Volver al hub</Button>
          </Link>
        )}
      >
        <Card>
          {loading ? (
            <LoadingState label="Cargando marca..." />
          ) : error && !success ? (
            <ErrorState message={error} />
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.xl }}>
              {error ? <ErrorState message={error} /> : null}
              {success ? <div role="status" style={{ color: theme.colors.success, fontWeight: 700 }}>{success}</div> : null}

              <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  <h2 style={{ margin: 0, fontSize: theme.typography.h3.size, letterSpacing: 0 }}>Logo</h2>
                  <Field label="URL logo" helpText="Opcional. Se muestra en lugar del texto visual cuando está disponible.">
                    <Input
                      aria-label="URL logo"
                      value={form.logoUrl ?? ''}
                      onChange={(event) => updateField('logoUrl', event.target.value)}
                      placeholder="https://cdn.tienda/logo.png"
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  <h2 style={{ margin: 0, fontSize: theme.typography.h3.size, letterSpacing: 0 }}>Portada</h2>
                  <Field label="URL banner" helpText="Opcional. Se usa como hero superior en la tienda pública.">
                    <Input
                      aria-label="URL banner"
                      value={form.bannerUrl ?? ''}
                      onChange={(event) => updateField('bannerUrl', event.target.value)}
                      placeholder="https://cdn.tienda/banner.jpg"
                    />
                  </Field>
                </div>
              </div>

              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                <h2 style={{ margin: 0, fontSize: theme.typography.h3.size, letterSpacing: 0 }}>Colores</h2>
                <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
                  <Field label="Color principal" helpText={`Hex de seis dígitos. Ejemplo: ${theme.colors.actionPrimary}.`}>
                    <Input
                      aria-label="Color principal"
                      value={form.primaryColor}
                      onChange={(event) => updateField('primaryColor', event.target.value)}
                      placeholder={theme.colors.actionPrimary}
                    />
                  </Field>
                  <Field label="Color secundario" helpText={`Hex de seis dígitos. Ejemplo: ${theme.colors.actionHover}.`}>
                    <Input
                      aria-label="Color secundario"
                      value={form.secondaryColor}
                      onChange={(event) => updateField('secondaryColor', event.target.value)}
                      placeholder={theme.colors.actionHover}
                    />
                  </Field>
                </div>
              </div>

              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                <h2 style={{ margin: 0, fontSize: theme.typography.h3.size, letterSpacing: 0 }}>Preview</h2>
                <div
                  style={{
                    ...storeBrandingCssVariables(form),
                    display: 'grid',
                    gap: theme.spacing.lg,
                    padding: theme.spacing.xl,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.borderDefault}`,
                    background: theme.colors.bgSurfaceAlt
                  }}
                >
                  {previewBranding.logoUrl ? (
                    <img
                      src={previewBranding.logoUrl}
                      alt=""
                      style={{ width: 96, maxHeight: 64, objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      aria-label="Logo preview"
                      style={{
                        width: 96,
                        minHeight: 56,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${theme.colors.borderDefault}`,
                        color: previewBranding.primaryColor,
                        fontWeight: 700
                      }}
                    >
                      Logo
                    </div>
                  )}
                  <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0 }}>
                    {activeStore?.storeSlug ?? 'Nombre de la tienda'}
                  </div>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                    <Button type="button" variant="primary">Botón principal</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      style={{
                        borderColor: previewBranding.secondaryColor,
                        color: previewBranding.secondaryColor
                      }}
                    >
                      Botón secundario
                    </Button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                <Button type="submit" variant="primary" disabled={saving || !isDirty}>
                  {saving ? 'Guardando...' : 'Guardar marca'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </Section>
    </AdminLayout>
  )
}
