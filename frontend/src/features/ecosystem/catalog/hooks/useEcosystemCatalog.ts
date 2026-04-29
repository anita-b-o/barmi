import { useQuery } from '@tanstack/react-query'
import { appConfig } from '@/app/config/env'
import { extractBackendErrorMessage } from '@/core/errors'
import { publicEcosystemAdapter } from '../api'
import type { PublicEcosystemCatalogSort } from '../../../../api/contracts/v1/public'

export function useEcosystemCatalog(query: string, sort: PublicEcosystemCatalogSort, deliverySupportedOnly: boolean) {
  const slug = appConfig.publicEcosystemSlug

  const ecosystemQuery = useQuery({
    queryKey: ['public-ecosystem', slug],
    queryFn: () => publicEcosystemAdapter.getEcosystem(slug)
  })

  const productsQuery = useQuery({
    queryKey: ['public-ecosystem-products', slug, query, sort, deliverySupportedOnly],
    queryFn: () => publicEcosystemAdapter.listProducts(slug, {
      query,
      activeOnly: true,
      sort,
      deliverySupported: deliverySupportedOnly ? true : undefined
    })
  })

  return {
    slug,
    ecosystem: ecosystemQuery.data ?? null,
    products: productsQuery.data ?? [],
    isLoading: ecosystemQuery.isLoading || productsQuery.isLoading,
    error: ecosystemQuery.error
      ? extractBackendErrorMessage(ecosystemQuery.error, 'Error cargando ecosystem')
      : productsQuery.error
        ? extractBackendErrorMessage(productsQuery.error, 'Error cargando productos del ecosystem')
        : null
  }
}
