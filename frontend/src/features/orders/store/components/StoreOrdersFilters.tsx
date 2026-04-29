import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import Select from '@/components/primitives/Select'
import { FilterBar, Field as FormField } from '@/components/forms'
import type { StoreDerivedBooleanFilter, StoreOrderStatusFilter } from '../types'

const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING_PAYMENT', label: 'PENDING_PAYMENT' },
  { value: 'PAID', label: 'PAID' },
  { value: 'CANCELLED', label: 'CANCELLED' }
]

const booleanOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'YES', label: 'Sí' },
  { value: 'NO', label: 'No' }
]

type StoreOrdersFiltersProps = {
  query: string
  status: StoreOrderStatusFilter
  operationalConflict: StoreDerivedBooleanFilter
  fulfillment: StoreDerivedBooleanFilter
  onQueryChange: (value: string) => void
  onStatusChange: (value: StoreOrderStatusFilter) => void
  onOperationalConflictChange: (value: StoreDerivedBooleanFilter) => void
  onFulfillmentChange: (value: StoreDerivedBooleanFilter) => void
  onReset: () => void
  hasActiveFilters: boolean
}

export function StoreOrdersFilters({
  query,
  status,
  operationalConflict,
  fulfillment,
  onQueryChange,
  onStatusChange,
  onOperationalConflictChange,
  onFulfillmentChange,
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
        <FormField label="Conflicto operativo">
          <Select
            value={operationalConflict}
            onChange={(event) => onOperationalConflictChange(event.target.value as StoreDerivedBooleanFilter)}
            options={booleanOptions}
          />
        </FormField>
        <FormField label="Fulfillment creado">
          <Select
            value={fulfillment}
            onChange={(event) => onFulfillmentChange(event.target.value as StoreDerivedBooleanFilter)}
            options={booleanOptions}
          />
        </FormField>
        <FormField
          label="Buscar por orderId"
          helpText="La búsqueda se reutiliza sobre la página actual del listado admin."
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
