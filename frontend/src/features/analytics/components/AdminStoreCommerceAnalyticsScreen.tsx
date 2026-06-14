import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/primitives/Button'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth'
import StoreCommerceAnalyticsPanel from './StoreCommerceAnalyticsPanel'
import StoreAnalyticsTabs from './StoreAnalyticsTabs'
import { useStoreCommerceAnalytics } from '../hooks/useStoreCommerceAnalytics'

export default function AdminStoreCommerceAnalyticsScreen() {
  const { me, logout } = useAuth()
  const commerceAnalytics = useStoreCommerceAnalytics()

  return (
    <AdminLayout>
      <Breadcrumbs items={[
        { label: 'Admin', href: routes.adminHome },
        { label: 'Store', href: routes.adminStore },
        { label: 'Analytics', href: routes.adminStoreAnalytics },
        { label: 'Commerce' }
      ]} />
      <PageHeader
        title="Commerce analytics"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <StoreAnalyticsTabs />

      <Section title="Store Commerce Analytics MVP">
        <StoreCommerceAnalyticsPanel
          loading={commerceAnalytics.loading}
          error={commerceAnalytics.error}
          onRetry={() => { void commerceAnalytics.refetch().catch(() => undefined) }}
          analytics={commerceAnalytics.analytics}
        />
      </Section>
    </AdminLayout>
  )
}
