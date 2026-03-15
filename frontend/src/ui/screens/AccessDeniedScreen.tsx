import { Link } from 'react-router-dom'
import { useAuth } from '../state/authContext'
import PlatformLayout from '../layout/PlatformLayout'
import Card from '../components/Card'
import { theme } from '../theme/theme'

export default function AccessDeniedScreen() {
  const { me } = useAuth()

  return (
    <PlatformLayout>
      <div style={{ maxWidth: 640, margin: '48px auto' }}>
        <Card>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Acceso denegado</h1>
          <p style={{ color: theme.colors.textMuted, marginTop: 0 }}>
            No tenés permisos para ver esta sección.
          </p>
          {me && (
            <Card variant="soft" style={{ marginTop: theme.spacing.lg }}>
              <div><strong>Usuario:</strong> {me.email}</div>
              <div style={{ marginTop: 6 }}><strong>ID:</strong> {me.userId}</div>
            </Card>
          )}
          <div style={{ marginTop: theme.spacing.lg }}>
            <Link to="/admin" style={{ color: theme.colors.primary, textDecoration: 'none', fontWeight: 600 }}>
              Volver al admin
            </Link>
          </div>
        </Card>
      </div>
    </PlatformLayout>
  )
}
