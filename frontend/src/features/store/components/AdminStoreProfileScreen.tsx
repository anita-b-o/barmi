import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StoreReadiness } from '@/api/contracts/v1/storeAdmin'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import StorePublicProfileForm from './StorePublicProfileForm'

export default function AdminStoreProfileScreen() {
  const { me, logout, authRequest } = useAuth()
  const [, setReadiness] = useState<StoreReadiness | null>(null)

  const reloadReadiness = useCallback(async () => {
    const data = await storeAdminAdapter.getStoreReadiness(authRequest)
    setReadiness(data)
  }, [authRequest])

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Información pública' }]} />
      <PageHeader
        title="Información pública"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge="Perfil público"
        title="Editá la información que ven tus clientes."
        description="Descripción y canales de contacto que aparecen en tu tienda pública cuando las secciones correspondientes están activas."
        tone="store"
      />

      <Section
        title="Información pública"
        action={(
          <Link to={routes.adminStorePublish} style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Volver a publicar</Button>
          </Link>
        )}
      >
        <Card>
          <StorePublicProfileForm authRequest={authRequest} onSaved={reloadReadiness} />
        </Card>
      </Section>
    </AdminLayout>
  )
}
