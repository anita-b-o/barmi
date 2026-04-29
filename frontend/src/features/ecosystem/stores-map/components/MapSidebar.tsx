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
  isLoading: boolean
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
  isLoading,
  error,
  onSearch,
  onSelectStore
}: MapSidebarProps) {
  return (
    <aside className="ecosystem-map-sidebar" aria-label="Exploración de tiendas">
      <MapSearchInput value={query} onSearch={onSearch} />

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
          isLoading={isLoading}
          error={error}
          onSelectStore={onSelectStore}
        />
      )}
    </aside>
  )
}
