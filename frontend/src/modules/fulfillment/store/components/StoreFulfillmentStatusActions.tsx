import { Button, Card, EmptyState } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import type { StoreFulfillmentStatus } from '../types'

const transitions: Record<StoreFulfillmentStatus, StoreFulfillmentStatus[]> = {
  PENDING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
}

type StoreFulfillmentStatusActionsProps = {
  currentStatus: StoreFulfillmentStatus | null
  loading: boolean
  onUpdate: (status: StoreFulfillmentStatus) => void
}

export function StoreFulfillmentStatusActions({
  currentStatus,
  loading,
  onUpdate
}: StoreFulfillmentStatusActionsProps) {
  const nextStatuses = currentStatus ? transitions[currentStatus] : []

  return (
    <Card>
      <div style={{ display: 'grid', gap: theme.spacing.lg }}>
        {!currentStatus ? (
          <EmptyState
            title="No se pudo determinar el estado"
            description="Recargá el detalle para obtener el estado real del fulfillment."
          />
        ) : nextStatuses.length === 0 ? (
          <EmptyState
            title="Sin transiciones disponibles"
            description="El fulfillment ya está en un estado terminal o no admite más cambios válidos."
          />
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {nextStatuses.map((status) => (
              <Button key={status} onClick={() => onUpdate(status)} disabled={loading}>
                {loading ? 'Actualizando...' : `Marcar ${status}`}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
