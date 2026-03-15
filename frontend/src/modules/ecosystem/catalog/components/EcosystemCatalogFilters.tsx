import { Input } from '../../../../design-system/components'
import { FilterBar } from '../../../../design-system/patterns'
import FormField from '../../../../ui/components/FormField'

type EcosystemCatalogFiltersProps = {
  query: string
  onQueryChange: (value: string) => void
}

export function EcosystemCatalogFilters({ query, onQueryChange }: EcosystemCatalogFiltersProps) {
  return (
    <FilterBar>
      <FormField
        label="Buscar"
        helpText="El backend público del ecosystem sólo soporta filtro por texto (`query`)."
      >
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar productos externos"
        />
      </FormField>
    </FilterBar>
  )
}
