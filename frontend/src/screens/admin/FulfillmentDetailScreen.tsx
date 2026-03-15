import { useParams } from 'react-router-dom'
import { AdminLayout } from '../../layouts'
import { PageHeader, SectionCard } from '../../design-system/patterns'
import { ErrorAlert, LoadingBlock } from '../../design-system/components'
import { useStoreFulfillmentDetail, StoreFulfillmentDetailCard, StoreFulfillmentStatusActions } from '../../modules/fulfillment'
import { theme } from '../../app/theme'

export default function FulfillmentDetailScreen() {
  const { fulfillmentId } = useParams()
  const fulfillment = useStoreFulfillmentDetail(fulfillmentId)

  return (
    <AdminLayout>
      <PageHeader
        title="Detalle de fulfillment STORE"
        subtitle={fulfillmentId}
      />

      {fulfillment.error ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={fulfillment.error} />
        </div>
      ) : null}

      {fulfillment.successMessage ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <div
            style={{
              background: '#EAF7F1',
              border: '1px solid #2F8F6B',
              color: '#2F8F6B',
              padding: theme.spacing.lg,
              borderRadius: theme.radius.md
            }}
          >
            {fulfillment.successMessage}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: theme.spacing.xl, display: 'grid', gap: theme.spacing.xl }}>
        <SectionCard title="Datos del fulfillment">
          {fulfillment.isLoading ? (
            <LoadingBlock label="Cargando fulfillment..." />
          ) : (
            <StoreFulfillmentDetailCard record={fulfillment.fulfillment} />
          )}
        </SectionCard>

        <SectionCard title="Actualizar estado">
          <StoreFulfillmentStatusActions
            currentStatus={fulfillment.currentStatus}
            loading={fulfillment.isUpdating}
            onUpdate={fulfillment.updateStatus}
          />
        </SectionCard>
      </div>
    </AdminLayout>
  )
}
