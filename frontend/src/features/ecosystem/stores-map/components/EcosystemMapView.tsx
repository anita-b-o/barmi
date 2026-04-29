import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'
import { ecosystemMapDefaultCenter, ecosystemMapDefaultZoom } from '../mapDefaults'
import { MapMarkersLayer, type LocatedStore } from './MapMarkersLayer'

type EcosystemMapViewProps = {
  mode: 'explore' | 'results'
  stores: PublicStoreMapStore[]
  selectedStoreId: string | null
  onSelectStore: (storeId: string) => void
}

function hasCoordinates(store: PublicStoreMapStore): store is LocatedStore {
  return typeof store.latitude === 'number' && typeof store.longitude === 'number'
}

export function EcosystemMapView({ mode, stores, selectedStoreId, onSelectStore }: EcosystemMapViewProps) {
  const locatedStores = mode === 'results' ? stores.filter(hasCoordinates) : []

  return (
    <section className="ecosystem-map-view" aria-label="Mapa de tiendas">
      <MapContainer
        center={ecosystemMapDefaultCenter}
        zoom={ecosystemMapDefaultZoom}
        minZoom={11}
        maxZoom={18}
        scrollWheelZoom
        zoomControl
        dragging
        className="ecosystem-map-view__leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapMarkersLayer stores={locatedStores} selectedStoreId={selectedStoreId} onSelectStore={onSelectStore} />
      </MapContainer>
    </section>
  )
}
