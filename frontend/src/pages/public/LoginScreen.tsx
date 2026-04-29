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
  from?: { pathname?: string }
}

export default function LoginScreen() {
  const { login, isAuthenticated, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = useMemo(() => {
    const state = location.state as LocationState | null
    return state?.from?.pathname || routes.adminHome
  }, [location.state])

  useEffect(() => {
    if (!isAuthenticated) return
    navigate(routes.adminHome, { replace: true })
  }, [isAuthenticated, navigate])

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
    <PlatformLayout>
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <Card>
            <div style={{ marginBottom: theme.spacing.lg }}>
              <h1 style={{ margin: 0 }}>Ingresar</h1>
              <p style={{ color: theme.colors.textMuted, marginTop: 6 }}>Accedé al backoffice con tu cuenta.</p>
            </div>

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
                  placeholder="••••••••"
                />
              </FormField>
              <Button type="submit" variant="primary" disabled={loading || !email.trim() || !password.trim()}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>

            {(localError || error) && (
              <div style={{ marginTop: theme.spacing.lg }}>
                <ErrorAlert message={localError ?? error ?? 'Error inesperado'} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </PlatformLayout>
  )
}
