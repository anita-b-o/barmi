import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { appConfig } from '@/app/config/env'
import { publicEcosystemAdapter } from '../../api/adapters/publicEcosystemAdapter'
import type { PublicEcosystemStoresMapLocationFilter } from '../../api/contracts/v1/public'
import { extractBackendErrorMessage } from '@/core/errors'
import { mapExploreGroups } from '@/features/ecosystem/stores-map/mapExploreConfig'
import { EcosystemMapView } from '@/features/ecosystem/stores-map/components/EcosystemMapView'
import { MapSidebar } from '@/features/ecosystem/stores-map/components/MapSidebar'
import '@/features/ecosystem/components/ecosystem-marketplace.css'
import { EcosystemLayout } from '../../layouts'
import { trackBetaEvent } from '@/features/beta'
import { useRef } from 'react'

export default function EcosystemStoresMapScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const slug = appConfig.publicEcosystemSlug
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const location = (searchParams.get('location') === 'all' ? 'all' : 'mapped') as PublicEcosystemStoresMapLocationFilter
  const selectedStoreId = searchParams.get('store')
  const trackedSearchRef = useRef('')

  useEffect(() => {
    trackBetaEvent({
      eventName: 'map_view',
      ecosystemSlug: slug,
      metadata: { surface: 'ecosystem_map' }
    })
  }, [slug])

  const storesQuery = useQuery({
    queryKey: ['public-ecosystem-stores-map', slug, query, category, location],
    queryFn: () => publicEcosystemAdapter.getStoresMap(slug, { query, category, location }),
    placeholderData: keepPreviousData
  })

  const stores = storesQuery.data?.stores ?? []
  const isFilteredMode = Boolean(query.trim() || category.trim() || selectedStoreId || location === 'all')
  const validSelectedStoreId = selectedStoreId && stores.some((store) => store.id === selectedStoreId)
    ? selectedStoreId
    : isFilteredMode
      ? stores[0]?.id ?? null
      : null

  useEffect(() => {
    if (!storesQuery.data) return
    if (!selectedStoreId || validSelectedStoreId === selectedStoreId) return
    const next = new URLSearchParams(searchParams)
    next.delete('store')
    setSearchParams(next, { replace: true })
  }, [searchParams, selectedStoreId, setSearchParams, storesQuery.data, validSelectedStoreId])

  useEffect(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized || trackedSearchRef.current === normalized) return
    trackedSearchRef.current = normalized
    trackBetaEvent({
      eventName: 'search_used',
      ecosystemSlug: slug,
      searchTerm: normalized,
      metadata: { surface: 'ecosystem_map' }
    })
  }, [query, slug])

  const updateParams = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || (key === 'location' && value === 'mapped')) next.delete(key)
      else next.set(key, value)
    })
    if (updates.q !== undefined || updates.category !== undefined || updates.location !== undefined) next.delete('store')
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  const selectStore = useCallback((storeId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('store', storeId)
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  const error = storesQuery.error ? extractBackendErrorMessage(storesQuery.error, 'Error cargando tiendas del ecosystem') : null

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
            isLoading={storesQuery.isLoading || storesQuery.isFetching}
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
