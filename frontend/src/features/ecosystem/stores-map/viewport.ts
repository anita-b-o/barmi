export type StoresMapViewportPoint = [number, number]

type StoresMapViewportStore = {
  id: string
  latitude: number | null
  longitude: number | null
}

type StoresMapViewportInput = {
  stores: StoresMapViewportStore[]
  selectedStoreId: string | null
  defaultCenter: StoresMapViewportPoint
  defaultZoom: number
}

export type StoresMapViewportIntent =
  | {
      type: 'default'
      center: StoresMapViewportPoint
      zoom: number
      duration: 0.35
    }
  | {
      type: 'selected-store'
      center: StoresMapViewportPoint
      minZoom: 15
      duration: 0.45
    }
  | {
      type: 'single-store'
      center: StoresMapViewportPoint
      zoom: 15
      duration: 0.45
    }
  | {
      type: 'bounds'
      positions: StoresMapViewportPoint[]
      padding: [48, 48]
      maxZoom: 15
    }

function hasValidCoordinates(store: StoresMapViewportStore) {
  return Number.isFinite(store.latitude) && Number.isFinite(store.longitude)
}

function toViewportPoint(store: StoresMapViewportStore): StoresMapViewportPoint {
  return [store.latitude as number, store.longitude as number]
}

export function getStoresMapViewportIntent({
  stores,
  selectedStoreId,
  defaultCenter,
  defaultZoom
}: StoresMapViewportInput): StoresMapViewportIntent {
  const locatedStores = stores.filter(hasValidCoordinates)

  if (locatedStores.length === 0) {
    return {
      type: 'default',
      center: defaultCenter,
      zoom: defaultZoom,
      duration: 0.35
    }
  }

  const selectedStore = locatedStores.find((store) => store.id === selectedStoreId)
  if (selectedStore) {
    return {
      type: 'selected-store',
      center: toViewportPoint(selectedStore),
      minZoom: 15,
      duration: 0.45
    }
  }

  if (locatedStores.length === 1) {
    return {
      type: 'single-store',
      center: toViewportPoint(locatedStores[0]),
      zoom: 15,
      duration: 0.45
    }
  }

  return {
    type: 'bounds',
    positions: locatedStores.map(toViewportPoint),
    padding: [48, 48],
    maxZoom: 15
  }
}
