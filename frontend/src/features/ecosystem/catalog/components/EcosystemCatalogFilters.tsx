import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import { FilterSidebar } from '../../components/FilterSidebar'
import type { PublicEcosystemCatalogSort } from '../../../../api/contracts/v1/public'

type EcosystemCatalogFiltersProps = {
  query: string
  sort: PublicEcosystemCatalogSort
  deliverySupportedOnly: boolean
  onQueryChange: (value: string) => void
  onSortChange: (value: PublicEcosystemCatalogSort) => void
  onDeliverySupportedOnlyChange: (value: boolean) => void
  onClearFilters?: () => void
  onClose?: () => void
}

const SORT_OPTIONS: Array<{ value: PublicEcosystemCatalogSort; label: string }> = [
  { value: 'default', label: 'Orden actual' },
  { value: 'name,asc', label: 'Nombre A-Z' },
  { value: 'name,desc', label: 'Nombre Z-A' },
  { value: 'price,asc', label: 'Precio menor' },
  { value: 'price,desc', label: 'Precio mayor' }
]

export function EcosystemCatalogFilters({
  query,
  sort,
  deliverySupportedOnly,
  onQueryChange,
  onSortChange,
  onDeliverySupportedOnlyChange,
  onClearFilters,
  onClose
}: EcosystemCatalogFiltersProps) {
  return (
    <FilterSidebar
      title="Filtros"
      description="Refiná resultados del catálogo público. Si no encontrás algo por nombre, después podés pasar al mapa y abrir una tienda."
      footer={onClose ? (
        <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
          Ver resultados
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={onClearFilters ?? (() => {
            onQueryChange('')
            onSortChange('default')
            onDeliverySupportedOnlyChange(false)
          })}
          style={{ width: '100%' }}
        >
          Limpiar filtros
        </Button>
      )}
    >
      <div className="ecosystem-filter-sidebar__section">
        <label htmlFor="ecosystem-catalog-search" className="ecosystem-filter-sidebar__label">
          Buscar
        </label>
        <Input
          id="ecosystem-catalog-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ej. pizza, remera, café"
          aria-label="Buscar productos ecosystem"
        />
      </div>

      <div className="ecosystem-filter-sidebar__section">
        <div className="ecosystem-filter-sidebar__label">Tipo</div>
        <label className="ecosystem-filter-sidebar__choice ecosystem-filter-sidebar__choice--active">
          <input type="checkbox" checked readOnly aria-label="Tipo producto activo" style={{ accentColor: 'var(--primary-500)' }} />
          Productos externos
        </label>
      </div>

      <div className="ecosystem-filter-sidebar__section">
        <div className="ecosystem-filter-sidebar__label">Entrega</div>
        <label className={`ecosystem-filter-sidebar__choice${deliverySupportedOnly ? ' ecosystem-filter-sidebar__choice--active' : ''}`}>
          <input
            type="checkbox"
            checked={deliverySupportedOnly}
            onChange={(event) => onDeliverySupportedOnlyChange(event.target.checked)}
            aria-label="Solo con entrega"
            style={{ accentColor: 'var(--primary-500)' }}
          />
          Solo con entrega
        </label>
      </div>

      <div className="ecosystem-filter-sidebar__section">
        <label htmlFor="ecosystem-catalog-sort" className="ecosystem-filter-sidebar__label">
          Orden
        </label>
        <SelectField
          id="ecosystem-catalog-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as PublicEcosystemCatalogSort)}
          options={SORT_OPTIONS}
          aria-label="Ordenar productos ecosystem"
        />
      </div>
    </FilterSidebar>
  )
}
