import { FormEvent, useEffect, useState } from 'react'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import { theme } from '@/app/theme'
import type { AuthRequestContext } from '@/core/api'
import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Field from '@/components/forms/Field'

type StorePublicProfileFormProps = {
  authRequest: AuthRequestContext
  onSaved?: () => Promise<void> | void
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

export default function StorePublicProfileForm({ authRequest, onSaved }: StorePublicProfileFormProps) {
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [publicDescription, setPublicDescription] = useState('')
  const [publicEmail, setPublicEmail] = useState('')
  const [publicPhone, setPublicPhone] = useState('')
  const [publicWhatsapp, setPublicWhatsapp] = useState('')

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
        setProfileLoaded(true)
      } catch (error) {
        if (!cancelled) setProfileError(toErrorMessage(error, 'No se pudo cargar la información pública.'))
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [authRequest])

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
      await onSaved?.()
    } catch (error) {
      setProfileError(toErrorMessage(error, 'No se pudo guardar la información pública.'))
    } finally {
      setSavingProfile(false)
    }
  }

  if (profileLoading) return <LoadingState label="Cargando información pública..." />
  if (profileError && !profileLoaded) return <ErrorState message={profileError} />

  return (
    <form onSubmit={handleProfileSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
        Estos datos se muestran en tu tienda pública cuando las secciones Sobre tu negocio y Contacto están activas.
      </div>
      {profileError ? <ErrorState message={profileError} /> : null}
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
  )
}
