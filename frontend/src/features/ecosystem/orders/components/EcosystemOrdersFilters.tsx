import Select from '@/components/primitives/Select'
import { FilterBar } from '@/components/forms'
import type { EcosystemOrdersFilterStatus } from '../types'

type EcosystemOrdersFiltersProps = {
  status: EcosystemOrdersFilterStatus
  onStatusChange: (status: EcosystemOrdersFilterStatus) => void
}

const options = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING_PAYMENT', label: 'PENDING_PAYMENT' },
  { value: 'PAID', label: 'PAID' },
  { value: 'CANCELLED', label: 'CANCELLED' }
]

export function EcosystemOrdersFilters({ status, onStatusChange }: EcosystemOrdersFiltersProps) {
  return (
    <FilterBar>
      <Select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as EcosystemOrdersFilterStatus)}
        options={options}
      />
    </FilterBar>
  )
}
