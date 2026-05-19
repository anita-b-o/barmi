import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import PlatformLayout from '@/layouts/PlatformLayout'
import Card from '@/components/primitives/Card'
import FormField from '@/components/forms/Field'
import TextInput from '@/components/primitives/Input'
import Button from '@/components/primitives/Button'
import ErrorAlert from '@/components/feedback/ErrorState'
import { theme } from '@/app/theme'

type LocationState = {
  from?: { pathname?: string; search?: string; hash?: string }
  reason?: string
}

export default function LoginScreen() {
  const { login, isAuthenticated, loading, error, sessionNotice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = useMemo(() => {
    const state = location.state as LocationState | null
    if (!state?.from?.pathname) return routes.adminHome
    return `${state.from.pathname}${state.from.search ?? ''}${state.from.hash ?? ''}`
  }, [location.state])
  const sessionMessage = (location.state as LocationState | null)?.reason ?? sessionNotice

  useEffect(() => {
    if (!isAuthenticated) return
    navigate(fromPath, { replace: true })
  }, [fromPath, isAuthenticated, navigate])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setLocalError('El email es obligatorio')
      return
    }

    if (!normalizedEmail.includes('@')) {
      setLocalError('Ingresá un email válido')
      return
    }

    if (!password.trim()) {
      setLocalError('La contraseña es obligatoria')
      return
    }

    setLocalError(null)
    const ok = await login(normalizedEmail, password)
    if (ok) navigate(fromPath, { replace: true })
  }

  return (
    <PlatformLayout
      customHeader={(
        <div style={{ background: 'var(--bg-page-dark)', borderBottom: '1px solid var(--barmi-color-border-default)' }}>
          <div style={{ width: 'min(100%, 1180px)', margin: '0 auto', padding: '14px 24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <img src="/barmi-logo.png" alt="" aria-hidden="true" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              <img src="/barmi-wordmark.png" alt="Barmi" style={{ width: 90, height: 'auto', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    >
      <div className="ecosystem-auth-page" style={{ display: 'grid', placeItems: 'center', minHeight: '76vh' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <Card
            style={{
              background: 'var(--barmi-bg-surface-dark)',
              color: 'var(--barmi-color-text-primary)',
              borderColor: 'var(--barmi-color-border-default)'
            }}
          >
            <div style={{ marginBottom: theme.spacing.xl, display: 'grid', gap: theme.spacing.md, justifyItems: 'start' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <img src="/barmi-logo.png" alt="" aria-hidden="true" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <img src="/barmi-wordmark.png" alt="Barmi" style={{ width: 92, height: 'auto', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: 'var(--primary-400)', fontSize: theme.typography.small.size, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Acceso
                </span>
                <h1 style={{ margin: 0 }}>Ingresar</h1>
                <p style={{ color: 'var(--barmi-color-text-muted)', margin: 0 }}>Accedé al backoffice con tu cuenta de Barmi. Si tu sesión venció, al volver te dejamos en la pantalla donde estabas.</p>
              </div>
            </div>

            {sessionMessage ? (
              <div
                role="status"
                style={{
                  marginBottom: theme.spacing.lg,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  background: 'rgba(240, 173, 78, 0.12)',
                  border: '1px solid rgba(240, 173, 78, 0.28)',
                  color: 'var(--warning-500)'
                }}
              >
                {sessionMessage}
              </div>
            ) : null}

            <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
              <FormField label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setLocalError(null)
                  }}
                  required
                  autoComplete="email"
                  placeholder="admin@example.com"
                />
              </FormField>
              <FormField label="Password">
                <TextInput
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setLocalError(null)
                  }}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </FormField>
              <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>

            {(localError || error) && (
              <div style={{ marginTop: theme.spacing.lg }}>
                <ErrorAlert
                  message={localError ?? error ?? 'Error inesperado'}
                  actionLabel="Volver a intentar"
                  onAction={() => {
                    setLocalError(null)
                    setPassword('')
                  }}
                />
                <div style={{ marginTop: theme.spacing.sm, color: 'var(--barmi-color-text-muted)', lineHeight: 1.5 }}>
                  Verificá email y contraseña. Si seguís sin poder entrar, usá feedback beta y contanos en qué paso falló.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PlatformLayout>
  )
}
