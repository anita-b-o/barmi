import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { publicAdapter } from '../../../api/adapters/publicAdapter'
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

  const productsQuery = useQuery({
    queryKey: ['public-store-products', slug, query, availableOnly, sort, normalizedCategoryId, page, size],
    queryFn: () => publicAdapter.getProductsPage(slug ?? '', {
      q: query,
      availableOnly,
      sort,
      categoryId: categoryId || undefined
    }, page, size),
    enabled,
    placeholderData: keepPreviousData
  })

  const refetch = () => {
    void storeQuery.refetch()
    void productsQuery.refetch()
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
    products: productsQuery.data?.content ?? [],
    productsPage: productsQuery.data ?? null,
    isInitialLoading: (storeQuery.isLoading || productsQuery.isLoading) && (!storeQuery.data || !productsQuery.data),
    isFetchingProducts: productsQuery.isFetching,
    isRetrying: storeQuery.isFetching || productsQuery.isFetching,
    error,
    refetch
  }
}
