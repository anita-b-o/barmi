import { Link } from 'react-router-dom'
import Card from '@/components/primitives/Card'
import { theme } from '@/app/theme'

type AccessDeniedStateProps = {
  email?: string | null
  userId?: string | null
  backHref?: string
  links?: Array<{ label: string; href: string }>
}

export default function AccessDeniedState({ email, userId, backHref = '/admin', links = [] }: AccessDeniedStateProps) {
  return (
    <Card>
      <h1 style={{ marginTop: 0, marginBottom: 8 }}>Acceso denegado</h1>
      <p style={{ color: theme.colors.textMuted, marginTop: 0 }}>
        No tenés permisos para ver esta sección. Usá uno de estos accesos para volver a un lugar útil.
      </p>
      {email ? (
        <Card variant="soft" style={{ marginTop: theme.spacing.lg }}>
          <div><strong>Usuario:</strong> {email}</div>
          {userId ? <div style={{ marginTop: 6 }}><strong>ID:</strong> {userId}</div> : null}
        </Card>
      ) : null}
      <div style={{ marginTop: theme.spacing.lg, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <Link to={backHref} style={{ color: theme.colors.primary, textDecoration: 'none', fontWeight: 600 }}>
          Volver al admin
        </Link>
        {links.map((link) => (
          <Link key={link.href} to={link.href} style={{ color: theme.colors.primary, textDecoration: 'none', fontWeight: 600 }}>
            {link.label}
          </Link>
        ))}
      </div>
    </Card>
  )
}
