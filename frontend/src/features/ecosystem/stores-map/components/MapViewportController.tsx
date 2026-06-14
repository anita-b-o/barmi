import { useEffect } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { ecosystemMapDefaultCenter, ecosystemMapDefaultZoom } from '../mapDefaults'
import { getStoresMapViewportIntent } from '../viewport'

type MapViewportStore = {
  id: string
  latitude: number
  longitude: number
}

type MapViewportControllerProps = {
  stores: MapViewportStore[]
  selectedStoreId: string | null
}

export function MapViewportController({ stores, selectedStoreId }: MapViewportControllerProps) {
  const map = useMap()

  useEffect(() => {
    const intent = getStoresMapViewportIntent({
      stores,
      selectedStoreId,
      defaultCenter: ecosystemMapDefaultCenter,
      defaultZoom: ecosystemMapDefaultZoom
    })

    if (intent.type === 'default') {
      map.flyTo(intent.center, intent.zoom, { duration: intent.duration })
      return
    }

    if (intent.type === 'selected-store') {
      map.flyTo(intent.center, Math.max(map.getZoom(), intent.minZoom), { duration: intent.duration })
      return
    }

    if (intent.type === 'single-store') {
      map.flyTo(intent.center, intent.zoom, { duration: intent.duration })
      return
    }

    const bounds = L.latLngBounds(intent.positions)
    map.fitBounds(bounds, { padding: intent.padding, maxZoom: intent.maxZoom })
  }, [map, selectedStoreId, stores])

  return null
}
