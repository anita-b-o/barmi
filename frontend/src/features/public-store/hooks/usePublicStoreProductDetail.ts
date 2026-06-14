import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicAdapter } from '../../../api/adapters/publicAdapter'
import { isApiError } from '@/api/client/errors'

type UsePublicStoreProductDetailParams = {
  storeSlug?: string
  productSlug?: string
}

export function usePublicStoreProductDetail({ storeSlug, productSlug }: UsePublicStoreProductDetailParams) {
  const enabled = Boolean(storeSlug && productSlug)

  const detailQuery = useQuery({
    queryKey: ['public-store-product', storeSlug, productSlug],
    queryFn: () => publicAdapter.getProductDetail(storeSlug ?? '', productSlug ?? ''),
    enabled,
    retry: false
  })

  const catalogQuery = useQuery({
    queryKey: ['public-store-products', storeSlug, 'detail-cart-lookup'],
    queryFn: () => publicAdapter.getProducts(storeSlug ?? ''),
    enabled: enabled && Boolean(detailQuery.data),
    retry: false
  })

  const cartProduct = useMemo(() => (
    catalogQuery.data?.find((product) => product.slug === productSlug) ?? null
  ), [catalogQuery.data, productSlug])

  const isNotFound = isApiError(detailQuery.error) && detailQuery.error.status === 404

  return {
    detail: detailQuery.data ?? null,
    cartProduct,
    isLoading: detailQuery.isLoading,
    isCartLookupLoading: catalogQuery.isLoading,
    isNotFound,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch
  }
}
