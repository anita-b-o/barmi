import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export type StoreProduct = { id: string; sku: string; name: string; priceCents: number }

export function useStoreProducts(storeSlug: string) {
  return useQuery({
    queryKey: ['store-products', storeSlug],
    queryFn: async () => {
      const { data } = await axios.get<StoreProduct[]>(`/api/public/stores/${storeSlug}/products`)
      return data
    },
    enabled: false
  })
}
