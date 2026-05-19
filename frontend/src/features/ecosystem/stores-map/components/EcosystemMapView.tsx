import { useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import Badge from '@/components/primitives/Badge'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'
import { ecosystemMapDefaultCenter, ecosystemMapDefaultZoom } from '../mapDefaults'
import { MapPanel } from '../../components/MapPanel'
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
  const locatedStores = useMemo(
    () => (mode === 'results' ? stores.filter(hasCoordinates) : []),
    [mode, stores]
  )
  const [tilesReady, setTilesReady] = useState(false)

  return (
    <MapPanel
      title="Mapa de tiendas"
      subtitle={mode === 'results'
        ? 'Pins reales, selección sincronizada y navegación directa al storefront público.'
        : 'Usá categorías o búsqueda para activar resultados y mostrar tiendas en el mapa.'}
      meta={<Badge variant="info">{locatedStores.length} con coordenadas</Badge>}
    >
      <section className="ecosystem-map-view" aria-label="Mapa de tiendas">
        {!tilesReady ? (
          <div className="ecosystem-map-view__loading" aria-hidden="true">
            <div className="ecosystem-map-view__loading-grid" />
          </div>
        ) : null}
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
            eventHandlers={{
              loading: () => setTilesReady(false),
              load: () => setTilesReady(true),
              tileerror: () => setTilesReady(true)
            }}
          />
          <MapMarkersLayer stores={locatedStores} selectedStoreId={selectedStoreId} onSelectStore={onSelectStore} />
        </MapContainer>
      </section>
    </MapPanel>
  )
}
