import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
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

type AssetKind = 'logo' | 'banner'

type AssetInputProps = {
  kind: AssetKind
  label: string
  url: string | null
  previewUrl: string | null
  selectedFile: File | null
  maxSizeLabel: string
  onSelect: (file: File) => void
  onRemove: () => void
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'No se pudo completar la acción.'
}

function AssetPreviewImage({ src, alt, kind }: { src: string; alt: string; kind: AssetKind }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (failed) return null

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: kind === 'banner' ? '100%' : 112,
        height: kind === 'banner' ? 120 : 72,
        objectFit: kind === 'banner' ? 'cover' : 'contain',
        borderRadius: theme.radius.sm,
        border: `1px solid ${theme.colors.borderDefault}`,
        background: theme.colors.bgSurfaceAlt
      }}
    />
  )
}

function AssetInput({ kind, label, url, previewUrl, selectedFile, maxSizeLabel, onSelect, onRemove }: AssetInputProps) {
  const inputId = `store-${kind}-file`
  const visibleUrl = previewUrl ?? url
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSelect(file)
    event.target.value = ''
  }

  return (
    <Field label={label} helpText={`${maxSizeLabel}. PNG, JPG o WebP.`}>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        {visibleUrl ? (
          <AssetPreviewImage src={visibleUrl} alt={`${label} de la tienda`} kind={kind} />
        ) : (
          <div
            aria-label={`${label} sin imagen`}
            style={{
              minHeight: kind === 'banner' ? 120 : 72,
              display: 'grid',
              placeItems: 'center',
              borderRadius: theme.radius.sm,
              border: `1px dashed ${theme.colors.borderDefault}`,
              color: theme.colors.textMuted,
              background: theme.colors.bgSurfaceAlt,
              fontWeight: 700
            }}
          >
            {label}
          </div>
        )}
        {selectedFile ? (
          <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
            {selectedFile.name}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <label
            htmlFor={inputId}
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
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Seleccionar archivo
          </label>
          <input
            id={inputId}
            aria-label={`Seleccionar archivo ${label.toLowerCase()}`}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChange}
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
          />
          {visibleUrl ? (
            <Button type="button" variant="ghost" onClick={onRemove}>
              Eliminar imagen
            </Button>
          ) : null}
        </div>
      </div>
    </Field>
  )
}

export default function AdminStoreBrandingScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStore = memberships.stores.find((membership) => membership.status === 'ACTIVE')
  const [form, setForm] = useState<StoreBranding>(emptyBranding)
  const [saved, setSaved] = useState<StoreBranding>(emptyBranding)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const previewBranding = useMemo(() => normalizeStoreBranding(form), [form])

  useEffect(() => () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
  }, [logoPreviewUrl])

  useEffect(() => () => {
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl)
  }, [bannerPreviewUrl])

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
        setLogoFile(null)
        setBannerFile(null)
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

  const selectLogo = (file: File) => {
    setSuccess(null)
    setError(null)
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoPreviewUrl(URL.createObjectURL(file))
    setLogoFile(file)
  }

  const selectBanner = (file: File) => {
    setSuccess(null)
    setError(null)
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl)
    setBannerPreviewUrl(URL.createObjectURL(file))
    setBannerFile(file)
  }

  const removeAsset = (key: 'logoUrl' | 'bannerUrl') => {
    setSuccess(null)
    if (key === 'logoUrl') {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
      setLogoPreviewUrl(null)
      setLogoFile(null)
    } else {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl)
      setBannerPreviewUrl(null)
      setBannerFile(null)
    }
    setForm((current) => ({ ...current, [key]: null }))
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
      if (logoFile) {
        payload.logoUrl = (await storeAdminAdapter.uploadStoreLogo(logoFile, authRequest)).url
      }
      if (bannerFile) {
        payload.bannerUrl = (await storeAdminAdapter.uploadStoreBanner(bannerFile, authRequest)).url
      }
      const data = await storeAdminAdapter.updateStoreBranding(payload, authRequest)
      setForm(data)
      setSaved(data)
      setLogoFile(null)
      setBannerFile(null)
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
        setLogoPreviewUrl(null)
      }
      if (bannerPreviewUrl) {
        URL.revokeObjectURL(bannerPreviewUrl)
        setBannerPreviewUrl(null)
      }
      setSuccess('Marca guardada.')
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const previewLogoUrl = logoPreviewUrl ?? previewBranding.logoUrl
  const previewBannerUrl = bannerPreviewUrl ?? previewBranding.bannerUrl
  const isDirty = JSON.stringify(form) !== JSON.stringify(saved) || Boolean(logoFile) || Boolean(bannerFile)

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
                  <AssetInput
                    kind="logo"
                    label="Logo"
                    url={form.logoUrl}
                    previewUrl={logoPreviewUrl}
                    selectedFile={logoFile}
                    maxSizeLabel="Máximo 5 MB"
                    onSelect={selectLogo}
                    onRemove={() => removeAsset('logoUrl')}
                  />
                </div>

                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  <h2 style={{ margin: 0, fontSize: theme.typography.h3.size, letterSpacing: 0 }}>Portada</h2>
                  <AssetInput
                    kind="banner"
                    label="Banner"
                    url={form.bannerUrl}
                    previewUrl={bannerPreviewUrl}
                    selectedFile={bannerFile}
                    maxSizeLabel="Máximo 10 MB"
                    onSelect={selectBanner}
                    onRemove={() => removeAsset('bannerUrl')}
                  />
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
                  {previewBannerUrl ? (
                    <AssetPreviewImage src={previewBannerUrl} alt="Portada de la tienda" kind="banner" />
                  ) : null}
                  {previewLogoUrl ? (
                    <AssetPreviewImage src={previewLogoUrl} alt="Logo de la tienda" kind="logo" />
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
