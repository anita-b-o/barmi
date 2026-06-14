import { FilterSidebar } from '../../components/FilterSidebar'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'
import type { MapExploreGroup } from '../mapExploreConfig'
import { MapCategoryGroup } from './MapCategoryGroup'
import { MapResultsList } from './MapResultsList'
import { MapSearchInput } from './MapSearchInput'

type MapSidebarProps = {
  mode: 'explore' | 'results'
  query: string
  exploreGroups: MapExploreGroup[]
  stores: PublicStoreMapStore[]
  selectedStoreId: string | null
  isInitialLoading: boolean
  isUpdating: boolean
  error: string | null
  onSearch: (query: string) => void
  onSelectStore: (storeId: string) => void
}

export function MapSidebar({
  mode,
  query,
  exploreGroups,
  stores,
  selectedStoreId,
  isInitialLoading,
  isUpdating,
  error,
  onSearch,
  onSelectStore
}: MapSidebarProps) {
  return (
    <FilterSidebar
      title={mode === 'explore' ? 'Explorá tu ciudad' : 'Tiendas cerca tuyo'}
      description={mode === 'explore'
        ? 'Entrá por categoría o búsqueda libre. Si sos nuevo en Barmi, esta vista suele ser la forma más fácil de entender qué tienda abrir.'
        : `${stores.length} tienda${stores.length === 1 ? '' : 's'} encontradas con los filtros actuales. Abrí una tienda para ver su catálogo propio y comprar con su carrito separado.`}
    >
      <div className="ecosystem-filter-sidebar__section">
        <MapSearchInput value={query} onSearch={onSearch} />
      </div>

      {mode === 'explore' ? (
        <div className="ecosystem-map-sidebar__explore">
          {exploreGroups.length > 0 ? (
            exploreGroups.map((group) => (
              <MapCategoryGroup key={group.id} group={group} onSelectQuery={onSearch} />
            ))
          ) : (
            <div className="ecosystem-map-results__state">No hay categorías para mostrar</div>
          )}
        </div>
      ) : (
        <MapResultsList
          stores={stores}
          selectedStoreId={selectedStoreId}
          isInitialLoading={isInitialLoading}
          isUpdating={isUpdating}
          error={error}
          onSelectStore={onSelectStore}
          onResetSearch={() => onSearch('')}
        />
      )}
    </FilterSidebar>
  )
}
