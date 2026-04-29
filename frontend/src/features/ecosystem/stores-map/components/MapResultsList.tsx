import { Link } from 'react-router-dom'
import { routes } from '@/core/constants/routes'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'

type MapResultsListProps = {
  stores: PublicStoreMapStore[]
  selectedStoreId: string | null
  isLoading: boolean
  error: string | null
  onSelectStore: (storeId: string) => void
}

export function MapResultsList({ stores, selectedStoreId, isLoading, error, onSelectStore }: MapResultsListProps) {
  if (isLoading) {
    return <div className="ecosystem-map-results__state">Cargando tiendas...</div>
  }

  if (error) {
    return <div className="ecosystem-map-results__state">{error}</div>
  }

  if (stores.length === 0) {
    return <div className="ecosystem-map-results__state">No encontramos tiendas con esos filtros</div>
  }

  return (
    <div className="ecosystem-map-results" aria-label="Tiendas filtradas">
      {stores.map((store) => (
        <div
          key={store.id}
          id={`ecosystem-store-item-${store.id}`}
          className="ecosystem-map-results__row"
          data-selected={store.id === selectedStoreId}
        >
          <button type="button" onClick={() => onSelectStore(store.id)}>
            <span>{store.name}</span>
            {store.locationLabel ? <small>{store.locationLabel}</small> : <small>Sin mapa todavía</small>}
          </button>
          <Link to={routes.publicStore(store.slug)} aria-label={`Abrir tienda ${store.name}`}>
            Ver
          </Link>
        </div>
      ))}
    </div>
  )
}
