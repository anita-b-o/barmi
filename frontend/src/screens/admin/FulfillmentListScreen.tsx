import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../layouts'
import { PageHeader, SectionCard } from '../../design-system/patterns'
import { ErrorAlert, LoadingBlock } from '../../design-system/components'
import { theme } from '../../app/theme'
import { routes } from '../../core/constants/routes'
import { useAuth } from '../../core/auth'
import { StoreFulfillmentTable, useStoreFulfillments } from '../../modules/fulfillment'

export default function FulfillmentListScreen() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const fulfillmentList = useStoreFulfillments()

  return (
    <AdminLayout>
      <PageHeader
        title="Fulfillments STORE"
        subtitle={me?.email}
      />

      {fulfillmentList.error ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={fulfillmentList.error} />
        </div>
      ) : null}

      <div style={{ marginTop: theme.spacing.xl }}>
        <SectionCard title="Fulfillments de la store actual">
          {fulfillmentList.loading ? (
            <LoadingBlock label="Cargando fulfillments..." />
          ) : (
            <StoreFulfillmentTable
              rows={fulfillmentList.fulfillments}
              onOpenDetail={(fulfillmentId) => navigate(routes.adminFulfillmentDetail(fulfillmentId))}
            />
          )}
        </SectionCard>
      </div>
    </AdminLayout>
  )
}
