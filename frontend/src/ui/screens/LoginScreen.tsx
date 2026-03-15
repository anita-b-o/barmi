import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/authContext'
import PlatformLayout from '../layout/PlatformLayout'
import Card from '../components/Card'
import FormField from '../components/FormField'
import TextInput from '../components/TextInput'
import Button from '../components/Button'
import ErrorAlert from '../components/ErrorAlert'
import { theme } from '../theme/theme'

type LocationState = {
  from?: { pathname?: string }
}

export default function LoginScreen() {
  const { login, isAuthenticated, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = useMemo(() => {
    const state = location.state as LocationState | null
    return state?.from?.pathname || '/admin'
  }, [location.state])

  if (isAuthenticated) {
    navigate('/admin', { replace: true })
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const ok = await login(email, password)
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
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="admin@example.com"
                />
              </FormField>
              <FormField label="Password">
                <TextInput
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="••••••••"
                />
              </FormField>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>

            {error && (
              <div style={{ marginTop: theme.spacing.lg }}>
                <ErrorAlert message={error} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </PlatformLayout>
  )
}
