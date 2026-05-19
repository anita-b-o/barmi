import { memo } from 'react'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'
import { routes } from '@/core/constants/routes'
import { StoreCard } from '../../components/StoreCard'

type MapResultsListProps = {
  stores: PublicStoreMapStore[]
  selectedStoreId: string | null
  isLoading: boolean
  error: string | null
  onSelectStore: (storeId: string) => void
  onResetSearch: () => void
}

function MapResultsListBase({ stores, selectedStoreId, isLoading, error, onSelectStore, onResetSearch }: MapResultsListProps) {
  if (isLoading) {
    return <div className="ecosystem-map-results__state">Cargando tiendas...</div>
  }

  if (error) {
    return <div className="ecosystem-map-results__state">{error}</div>
  }

  if (stores.length === 0) {
    return (
      <div className="ecosystem-map-results__state">
        <div style={{ display: 'grid', gap: 12 }}>
          <div>No encontramos tiendas con esos filtros. Probá otra búsqueda más corta o volvé a la exploración inicial.</div>
          <button
            type="button"
            onClick={onResetSearch}
            style={{
              width: 'fit-content',
              border: '1px solid var(--barmi-color-border-default)',
              background: 'var(--barmi-color-surface)',
              borderRadius: 999,
              padding: '8px 14px',
              cursor: 'pointer',
              font: 'inherit'
            }}
          >
            Limpiar búsqueda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ecosystem-map-results" aria-label="Tiendas filtradas">
      {stores.map((store) => (
        <div key={store.id} id={`ecosystem-store-item-${store.id}`}>
          <StoreCard
            layout="list"
            selected={store.id === selectedStoreId}
            store={{
              id: store.id,
              name: store.name,
              storeHref: routes.publicStore(store.slug),
              categoryLabel: store.category?.label ?? null,
              locationLabel: store.locationLabel,
              hasPublicLocation: store.hasPublicLocation
            }}
            onSelect={() => onSelectStore(store.id)}
          />
        </div>
      ))}
    </div>
  )
}

export const MapResultsList = memo(MapResultsListBase)
