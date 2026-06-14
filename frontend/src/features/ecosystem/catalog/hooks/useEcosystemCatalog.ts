import { useDeferredValue } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { appConfig } from '@/app/config/env'
import { extractBackendErrorMessage } from '@/core/errors'
import { publicEcosystemAdapter } from '../api'
import { DEFAULT_ECOSYSTEM_CATALOG_PAGE_SIZE, ecosystemDiscoveryQueryKeys, normalizeEcosystemCatalogFilters } from '@/features/ecosystem/discovery'
import type { PublicEcosystemCatalogSort } from '../../../../api/contracts/v1/public'

export function useEcosystemCatalog(
  query: string,
  sort: PublicEcosystemCatalogSort,
  deliverySupportedOnly: boolean,
  page = 0,
  size = DEFAULT_ECOSYSTEM_CATALOG_PAGE_SIZE
) {
  const slug = appConfig.publicEcosystemSlug
  const deferredQuery = useDeferredValue(query)
  const filters = normalizeEcosystemCatalogFilters({
    query: deferredQuery,
    sort,
    deliverySupported: deliverySupportedOnly,
    page,
    size
  })

  const ecosystemQuery = useQuery({
    queryKey: ecosystemDiscoveryQueryKeys.publicEcosystem(slug),
    queryFn: () => publicEcosystemAdapter.getEcosystem(slug)
  })

  const productsQuery = useQuery({
    queryKey: ecosystemDiscoveryQueryKeys.products(slug, filters),
    queryFn: () => publicEcosystemAdapter.listProducts(slug, {
      query: filters.query,
      activeOnly: true,
      sort: filters.sort,
      deliverySupported: filters.deliverySupported ? true : undefined,
      page: filters.page,
      size: filters.size
    }),
    placeholderData: keepPreviousData
  })

  const productsPage = productsQuery.data ?? null

  return {
    slug,
    ecosystem: ecosystemQuery.data ?? null,
    productsPage,
    products: productsPage?.content ?? [],
    isLoading: productsQuery.isLoading && !productsPage,
    isFetchingProducts: productsQuery.isFetching,
    isMetadataLoading: ecosystemQuery.isLoading && !ecosystemQuery.data,
    ecosystemError: ecosystemQuery.error
      ? extractBackendErrorMessage(ecosystemQuery.error, 'Error cargando ecosystem')
      : null,
    productsError: productsQuery.error
      ? extractBackendErrorMessage(productsQuery.error, 'Error cargando productos del ecosystem')
      : null
  }
}
