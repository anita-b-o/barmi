import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthRequestContext } from '@/core/api'
import { shippingZonesApi } from '../api'
import type { CreateZonePayload } from '../types'

export function useShippingZones(auth: AuthRequestContext) {
  const queryClient = useQueryClient()

  const fetchZones = useQuery({
    queryKey: ['shipping-zones'],
    queryFn: () => shippingZonesApi.listZones(auth)
  })

  const createZone = useMutation({
    mutationFn: (newZone: CreateZonePayload) => shippingZonesApi.createZone(newZone, auth),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shipping-zones'] })
    }
  })

  const deleteZone = useMutation({
    mutationFn: (zoneId: string) => shippingZonesApi.deleteZone(zoneId, auth),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shipping-zones'] })
    }
  })

  return { fetchZones, createZone, deleteZone }
}
