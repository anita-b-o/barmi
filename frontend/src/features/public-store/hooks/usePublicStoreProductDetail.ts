import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { hasPublicStoreCapability, publicAdapter } from '../../../api/adapters/publicAdapter'
import { isApiError } from '@/api/client/errors'

type UsePublicStoreProductDetailParams = {
  storeSlug?: string
  productSlug?: string
}

export function usePublicStoreProductDetail({ storeSlug, productSlug }: UsePublicStoreProductDetailParams) {
  const enabled = Boolean(storeSlug && productSlug)

  const storeQuery = useQuery({
    queryKey: ['public-store', storeSlug],
    queryFn: () => publicAdapter.getStore(storeSlug ?? ''),
    enabled: Boolean(storeSlug),
    retry: false
  })
  const productsEnabled = hasPublicStoreCapability(storeQuery.data?.capabilities, 'PRODUCTS')
  const checkoutEnabled = hasPublicStoreCapability(storeQuery.data?.capabilities, 'CHECKOUT')

  const detailQuery = useQuery({
    queryKey: ['public-store-product', storeSlug, productSlug],
    queryFn: () => publicAdapter.getProductDetail(storeSlug ?? '', productSlug ?? ''),
    enabled: enabled && productsEnabled,
    retry: false
  })

  const catalogQuery = useQuery({
    queryKey: ['public-store-products', storeSlug, 'detail-cart-lookup'],
    queryFn: () => publicAdapter.getProducts(storeSlug ?? ''),
    enabled: enabled && Boolean(detailQuery.data) && productsEnabled && checkoutEnabled,
    retry: false
  })

  const cartProduct = useMemo(() => (
    catalogQuery.data?.find((product) => product.slug === productSlug) ?? null
  ), [catalogQuery.data, productSlug])

  const isNotFound = (!productsEnabled && Boolean(storeQuery.data)) ||
    (isApiError(detailQuery.error) && detailQuery.error.status === 404)

  return {
    detail: detailQuery.data ?? null,
    store: storeQuery.data ?? null,
    cartProduct,
    productsEnabled,
    checkoutEnabled,
    isLoading: detailQuery.isLoading,
    isCartLookupLoading: catalogQuery.isLoading,
    isNotFound,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch
  }
}
