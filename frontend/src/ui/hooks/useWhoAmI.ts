import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export type WhoAmI = { storeSlug: string | null }

export function useWhoAmI() {
  return useQuery({
    queryKey: ['whoami'],
    queryFn: async () => {
      const { data } = await axios.get<WhoAmI>('/api/public/whoami')
      return data
    }
  })
}
