import { useEffect, useRef } from 'react'
import { appConfig } from '@/app/config/env'
import { useEcosystemStoresMapUrlState } from '@/features/ecosystem/discovery/urlState'
import { mapExploreGroups } from '@/features/ecosystem/stores-map/mapExploreConfig'
import { EcosystemMapView } from '@/features/ecosystem/stores-map/components/EcosystemMapView'
import { MapSidebar } from '@/features/ecosystem/stores-map/components/MapSidebar'
import { useEcosystemStoresMapData } from '@/features/ecosystem/stores-map/hooks/useEcosystemStoresMapData'
import { getValidStoresMapSelection } from '@/features/ecosystem/stores-map/selection'
import '@/features/ecosystem/components/ecosystem-marketplace.css'
import { EcosystemLayout } from '../../layouts'
import { trackBetaEvent } from '@/features/beta'
import { routes } from '@/core/constants/routes'
import { useSeoMetadata } from '@/core/seo'

export default function EcosystemStoresMapScreen() {
  const slug = appConfig.publicEcosystemSlug
  const {
    query,
    selectedStoreId,
    filters,
    updateParams,
    selectStore,
    clearInvalidSelection
  } = useEcosystemStoresMapUrlState()
  const trackedSearchRef = useRef('')

  useEffect(() => {
    trackBetaEvent({
      eventName: 'map_view',
      ecosystemSlug: slug,
      metadata: { surface: 'ecosystem_map' }
    })
  }, [slug])

  const {
    storesMapData,
    stores,
    isInitialLoading,
    isUpdating,
    error
  } = useEcosystemStoresMapData(slug, filters)
  const ecosystemName = storesMapData?.ecosystem.name ?? 'Barmi'
  useSeoMetadata({
    title: `Mapa de tiendas de ${ecosystemName} | Barmi`,
    description: `Explora tiendas de ${ecosystemName} por ubicacion y categoria.`,
    path: routes.ecosystemStoresMap,
    robots: 'noindex,follow'
  })
  const isFilteredMode = Boolean(filters.query || filters.category || filters.selectedStoreId || filters.location === 'all')
  const validSelectedStoreId = getValidStoresMapSelection({
    stores,
    selectedStoreId: filters.selectedStoreId,
    isFilteredMode
  })

  useEffect(() => {
    if (!storesMapData) return
    if (!selectedStoreId || validSelectedStoreId === selectedStoreId) return
    clearInvalidSelection()
  }, [clearInvalidSelection, selectedStoreId, storesMapData, validSelectedStoreId])

  useEffect(() => {
    const normalized = filters.query.toLowerCase()
    if (!normalized || trackedSearchRef.current === normalized) return
    trackedSearchRef.current = normalized
    trackBetaEvent({
      eventName: 'search_used',
      ecosystemSlug: slug,
      searchTerm: normalized,
      metadata: { surface: 'ecosystem_map' }
    })
  }, [filters.query, slug])

  return (
    <EcosystemLayout>
      <main className="ecosystem-map-page">
        <div className="ecosystem-map-page__shell">
          <MapSidebar
            mode={isFilteredMode ? 'results' : 'explore'}
            query={query}
            exploreGroups={mapExploreGroups}
            stores={stores}
            selectedStoreId={validSelectedStoreId}
            isInitialLoading={isInitialLoading}
            isUpdating={isUpdating}
            error={error}
            onSearch={(value) => updateParams({ q: value })}
            onSelectStore={selectStore}
          />
          <EcosystemMapView
            mode={isFilteredMode ? 'results' : 'explore'}
            stores={stores}
            selectedStoreId={validSelectedStoreId}
            onSelectStore={selectStore}
          />
        </div>
      </main>
    </EcosystemLayout>
  )
}
