import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { hasPublicStoreCapability, publicAdapter } from '../../../api/adapters/publicAdapter'
import type { PublicStoreCatalogSort } from '../../../api/contracts/v1/public'

type UsePublicStoreCatalogParams = {
  slug?: string
  query: string
  availableOnly: boolean
  sort: PublicStoreCatalogSort
  categoryId: string
  page: number
  size: number
}

export function usePublicStoreCatalog({
  slug,
  query,
  availableOnly,
  sort,
  categoryId,
  page,
  size
}: UsePublicStoreCatalogParams) {
  const enabled = Boolean(slug)
  const normalizedCategoryId = categoryId || 'all'

  const storeQuery = useQuery({
    queryKey: ['public-store', slug],
    queryFn: () => publicAdapter.getStore(slug ?? ''),
    enabled
  })
  const productsEnabled = hasPublicStoreCapability(storeQuery.data?.capabilities, 'PRODUCTS')

  const productsQuery = useQuery({
    queryKey: ['public-store-products', slug, query, availableOnly, sort, normalizedCategoryId, page, size],
    queryFn: () => publicAdapter.getProductsPage(slug ?? '', {
      q: query,
      availableOnly,
      sort,
      categoryId: categoryId || undefined
    }, page, size),
    enabled: enabled && Boolean(storeQuery.data) && productsEnabled,
    placeholderData: keepPreviousData
  })

  const refetch = () => {
    void storeQuery.refetch()
    if (storeQuery.data && productsEnabled) {
      void productsQuery.refetch()
    }
  }

  const storeError = storeQuery.error
  const productsError = productsQuery.error
  const error = storeError
    ? extractBackendErrorMessage(storeError, 'Error cargando store')
    : productsError
      ? extractBackendErrorMessage(productsError, 'Error cargando productos')
      : null

  return {
    store: storeQuery.data ?? null,
    products: productsEnabled ? productsQuery.data?.content ?? [] : [],
    productsPage: productsEnabled ? productsQuery.data ?? null : null,
    productsEnabled,
    isInitialLoading: storeQuery.isLoading || (productsEnabled && productsQuery.isLoading && (!storeQuery.data || !productsQuery.data)),
    isFetchingProducts: productsQuery.isFetching,
    isRetrying: storeQuery.isFetching || productsQuery.isFetching,
    error,
    refetch
  }
}
