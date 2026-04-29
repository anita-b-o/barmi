import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import EmptyState from '@/components/feedback/EmptyState'
import { theme } from '@/app/theme'
import type { EcosystemFulfillmentStatus } from '../types'

const transitions: Record<EcosystemFulfillmentStatus, EcosystemFulfillmentStatus[]> = {
  PENDING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
}

type EcosystemFulfillmentStatusActionsProps = {
  currentStatus: EcosystemFulfillmentStatus | null
  loading: boolean
  onUpdate: (status: EcosystemFulfillmentStatus) => void
}

export function EcosystemFulfillmentStatusActions({
  currentStatus,
  loading,
  onUpdate
}: EcosystemFulfillmentStatusActionsProps) {
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
                {loading ? 'Actualizando...' : `Actualizar a ${status}`}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
