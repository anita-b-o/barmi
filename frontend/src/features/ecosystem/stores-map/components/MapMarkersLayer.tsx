import { memo, useMemo } from 'react'
import L, { type LatLngExpression } from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'
import { appConfig } from '@/app/config/env'
import { trackBetaEvent } from '@/features/beta'
import { MapViewportController } from './MapViewportController'

export type LocatedStore = PublicStoreMapStore & {
  latitude: number
  longitude: number
}

type MapMarkersLayerProps = {
  stores: LocatedStore[]
  selectedStoreId: string | null
  onSelectStore: (storeId: string) => void
}

const defaultMarkerIcon = L.divIcon({
  className: 'ecosystem-map-marker',
  html: '<span></span>',
  iconSize: [38, 50],
  iconAnchor: [19, 44],
  popupAnchor: [0, -40]
})

const selectedMarkerIcon = L.divIcon({
  className: 'ecosystem-map-marker ecosystem-map-marker--selected',
  html: '<span></span>',
  iconSize: [42, 54],
  iconAnchor: [21, 48],
  popupAnchor: [0, -44]
})

function toPosition(store: LocatedStore): LatLngExpression {
  return [store.latitude, store.longitude]
}

function MapMarkersLayerBase({ stores, selectedStoreId, onSelectStore }: MapMarkersLayerProps) {
  const markerItems = useMemo(
    () => stores.map((store) => ({ store, position: toPosition(store) })),
    [stores]
  )

  return (
    <>
      <MapViewportController stores={stores} selectedStoreId={selectedStoreId} />
      {markerItems.map(({ store, position }) => (
        <Marker
          key={store.id}
          position={position}
          icon={store.id === selectedStoreId ? selectedMarkerIcon : defaultMarkerIcon}
          title={store.name}
          eventHandlers={{
            click: () => {
              trackBetaEvent({
                eventName: 'map_pin_click',
                ecosystemSlug: appConfig.publicEcosystemSlug,
                storeId: store.id,
                storeSlug: store.slug,
                storeName: store.name,
                metadata: { surface: 'ecosystem_map_pin' }
              })
              onSelectStore(store.id)
            }
          }}
        >
          <Popup>
            <strong>{store.name}</strong>
            {store.locationLabel ? <span>{store.locationLabel}</span> : null}
          </Popup>
        </Marker>
      ))}
    </>
  )
}

export const MapMarkersLayer = memo(MapMarkersLayerBase)
