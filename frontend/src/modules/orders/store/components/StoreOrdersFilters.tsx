import { Input, Select, Button } from '../../../../design-system/components'
import { FilterBar } from '../../../../design-system/patterns'
import FormField from '../../../../ui/components/FormField'
import type { StoreOrderStatusFilter } from '../types'

const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING_PAYMENT', label: 'PENDING_PAYMENT' },
  { value: 'PAID', label: 'PAID' },
  { value: 'CANCELLED', label: 'CANCELLED' }
]

type StoreOrdersFiltersProps = {
  query: string
  status: StoreOrderStatusFilter
  onQueryChange: (value: string) => void
  onStatusChange: (value: StoreOrderStatusFilter) => void
  onReset: () => void
  hasActiveFilters: boolean
}

export function StoreOrdersFilters({
  query,
  status,
  onQueryChange,
  onStatusChange,
  onReset,
  hasActiveFilters
}: StoreOrdersFiltersProps) {
  return (
    <FilterBar>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <FormField label="Estado">
          <Select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as StoreOrderStatusFilter)}
            options={statusOptions}
          />
        </FormField>
        <FormField
          label="Buscar por orderId"
          helpText="La búsqueda es cliente sobre la página actual porque el backend no expone query por orderId."
        >
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="UUID de orden"
          />
        </FormField>
      </div>
      <div>
        <Button variant="secondary" onClick={onReset} disabled={!hasActiveFilters}>
          Limpiar filtros
        </Button>
      </div>
    </FilterBar>
  )
}
