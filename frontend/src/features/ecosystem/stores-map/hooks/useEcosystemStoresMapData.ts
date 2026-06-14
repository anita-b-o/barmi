import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { publicEcosystemAdapter } from '@/api/adapters/publicEcosystemAdapter'
import { extractBackendErrorMessage } from '@/core/errors'
import {
  ecosystemDiscoveryQueryKeys,
  type EcosystemStoresMapFilters
} from '@/features/ecosystem/discovery'

export function useEcosystemStoresMapData(slug: string, filters: EcosystemStoresMapFilters) {
  const storesQuery = useQuery({
    queryKey: ecosystemDiscoveryQueryKeys.storesMap(slug, filters),
    queryFn: () => publicEcosystemAdapter.getStoresMap(slug, {
      query: filters.query,
      category: filters.category,
      location: filters.location,
      sort: filters.sort
    }),
    placeholderData: keepPreviousData
  })

  const stores = storesQuery.data?.stores ?? []
  const hasStoresMapData = storesQuery.data !== undefined
  const isInitialLoading = storesQuery.isLoading && !hasStoresMapData
  const isUpdating = storesQuery.isFetching && hasStoresMapData
  const error = storesQuery.error ? extractBackendErrorMessage(storesQuery.error, 'Error cargando tiendas del ecosystem') : null

  return {
    storesMapData: storesQuery.data,
    stores,
    isInitialLoading,
    isUpdating,
    error
  }
}
