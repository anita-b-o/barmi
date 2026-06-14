import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/primitives/Button'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth'
import StoreAnalyticsTabs from './StoreAnalyticsTabs'
import StoreFunnelAnalyticsPanel from './StoreFunnelAnalyticsPanel'
import { useStoreFunnelAnalytics } from '../hooks/useStoreFunnelAnalytics'

export default function AdminStoreFunnelAnalyticsScreen() {
  const { me, logout } = useAuth()
  const funnelAnalytics = useStoreFunnelAnalytics()

  return (
    <AdminLayout>
      <Breadcrumbs items={[
        { label: 'Admin', href: routes.adminHome },
        { label: 'Store', href: routes.adminStore },
        { label: 'Analytics', href: routes.adminStoreAnalytics },
        { label: 'Funnel' }
      ]} />
      <PageHeader
        title="Funnel analytics"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <StoreAnalyticsTabs />

      <Section title="Funnel Analytics MVP">
        <StoreFunnelAnalyticsPanel
          loading={funnelAnalytics.loading}
          error={funnelAnalytics.error}
          onRetry={() => { void funnelAnalytics.refetch().catch(() => undefined) }}
          analytics={funnelAnalytics.analytics}
        />
      </Section>
    </AdminLayout>
  )
}
