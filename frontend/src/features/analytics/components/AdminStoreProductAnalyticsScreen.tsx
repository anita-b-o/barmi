import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/primitives/Button'
import { routes } from '@/core/constants/routes'
import { useAuth } from '@/core/auth'
import StoreProductAnalyticsTable from './StoreProductAnalyticsTable'
import StoreAnalyticsTabs from './StoreAnalyticsTabs'
import { useStoreProductAnalytics } from '../hooks/useStoreProductAnalytics'

export default function AdminStoreProductAnalyticsScreen() {
  const { me, logout } = useAuth()
  const productAnalytics = useStoreProductAnalytics('7d')

  return (
    <AdminLayout>
      <Breadcrumbs items={[
        { label: 'Admin', href: routes.adminHome },
        { label: 'Store', href: routes.adminStore },
        { label: 'Analytics' }
      ]} />
      <PageHeader
        title="Analytics de productos"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <StoreAnalyticsTabs />

      <Section title="Funnel público de productos">
        <StoreProductAnalyticsTable
          loading={productAnalytics.loading}
          error={productAnalytics.error}
          onRetry={() => { void productAnalytics.refetch().catch(() => undefined) }}
          analytics={productAnalytics.analytics}
        />
      </Section>
    </AdminLayout>
  )
}
