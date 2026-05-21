import { useDeferredValue } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { appConfig } from '@/app/config/env'
import { extractBackendErrorMessage } from '@/core/errors'
import { publicEcosystemAdapter } from '../api'
import type { PublicEcosystemCatalogSort } from '../../../../api/contracts/v1/public'

export function useEcosystemCatalog(query: string, sort: PublicEcosystemCatalogSort, deliverySupportedOnly: boolean) {
  const slug = appConfig.publicEcosystemSlug
  const deferredQuery = useDeferredValue(query)

  const ecosystemQuery = useQuery({
    queryKey: ['public-ecosystem', slug],
    queryFn: () => publicEcosystemAdapter.getEcosystem(slug)
  })

  const productsQuery = useQuery({
    queryKey: ['public-ecosystem-products', slug, deferredQuery, sort, deliverySupportedOnly],
    queryFn: () => publicEcosystemAdapter.listProducts(slug, {
      query: deferredQuery,
      activeOnly: true,
      sort,
      deliverySupported: deliverySupportedOnly ? true : undefined
    }),
    placeholderData: keepPreviousData
  })

  return {
    slug,
    ecosystem: ecosystemQuery.data ?? null,
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading && !productsQuery.data,
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
