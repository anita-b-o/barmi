import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ecosystemMapDefaultCenter, ecosystemMapDefaultZoom } from '../mapDefaults'
import { MapMarkersLayer, type LocatedStore } from '../components/MapMarkersLayer'
import { clickElement, renderWithProviders } from '../../../../test-utils/testUtils'
import { trackBetaEvent } from '@/features/beta'

const mapMocks = vi.hoisted(() => ({
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  getZoom: vi.fn(),
  latLngBounds: vi.fn((positions: unknown) => ({ type: 'bounds', positions }))
}))

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((options: unknown) => ({ type: 'div-icon', options })),
    latLngBounds: mapMocks.latLngBounds
  }
}))

vi.mock('react-leaflet', () => ({
  useMap: () => ({
    flyTo: mapMocks.flyTo,
    fitBounds: mapMocks.fitBounds,
    getZoom: mapMocks.getZoom
  }),
  Marker: ({
    title,
    eventHandlers,
    children
  }: {
    title: string
    eventHandlers?: { click?: () => void }
    children: React.ReactNode
  }) => (
    <button type="button" aria-label={title} onClick={eventHandlers?.click}>
      {children}
    </button>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}))

vi.mock('@/features/beta', () => ({
  trackBetaEvent: vi.fn()
}))

function createStore(overrides: Partial<LocatedStore>): LocatedStore {
  return {
    id: 'store-1',
    slug: 'demo-store',
    name: 'Demo Store',
    category: null,
    hasPublicLocation: true,
    locationLabel: 'La Plata Centro',
    latitude: -34.920494,
    longitude: -57.953565,
    createdAt: '2026-03-20T12:00:00.000Z',
    ...overrides
  }
}

async function renderLayer(stores: LocatedStore[], selectedStoreId: string | null = null) {
  const onSelectStore = vi.fn()
  const view = await renderWithProviders(
    <MapMarkersLayer stores={stores} selectedStoreId={selectedStoreId} onSelectStore={onSelectStore} />
  )

  return { ...view, onSelectStore }
}

beforeEach(() => {
  mapMocks.flyTo.mockClear()
  mapMocks.fitBounds.mockClear()
  mapMocks.getZoom.mockReset()
  mapMocks.latLngBounds.mockClear()
  vi.mocked(trackBetaEvent).mockClear()
})

describe('MapMarkersLayer viewport behavior', () => {
  it('flies to the default viewport when there are no stores', async () => {
    mapMocks.getZoom.mockReturnValue(13)

    const { cleanup } = await renderLayer([])

    expect(mapMocks.flyTo).toHaveBeenCalledWith(ecosystemMapDefaultCenter, ecosystemMapDefaultZoom, { duration: 0.35 })
    expect(mapMocks.fitBounds).not.toHaveBeenCalled()

    await cleanup()
  })

  it('flies to a valid selected store with the current zoom floor', async () => {
    mapMocks.getZoom.mockReturnValue(16)
    const selectedStore = createStore({ id: 'store-2', latitude: -34.921332, longitude: -57.95532 })

    const { cleanup } = await renderLayer([
      createStore({ id: 'store-1' }),
      selectedStore
    ], 'store-2')

    expect(mapMocks.flyTo).toHaveBeenCalledWith(
      [selectedStore.latitude, selectedStore.longitude],
      16,
      { duration: 0.45 }
    )
    expect(mapMocks.fitBounds).not.toHaveBeenCalled()

    await cleanup()
  })

  it('flies to zoom 15 when there is a single store', async () => {
    mapMocks.getZoom.mockReturnValue(13)
    const store = createStore({ id: 'store-1' })

    const { cleanup } = await renderLayer([store])

    expect(mapMocks.flyTo).toHaveBeenCalledWith([store.latitude, store.longitude], 15, { duration: 0.45 })
    expect(mapMocks.fitBounds).not.toHaveBeenCalled()

    await cleanup()
  })

  it('fits bounds with the configured padding and max zoom when there are multiple stores', async () => {
    mapMocks.getZoom.mockReturnValue(13)
    const storeOne = createStore({ id: 'store-1', latitude: -34.920494, longitude: -57.953565 })
    const storeTwo = createStore({ id: 'store-2', latitude: -34.921332, longitude: -57.95532 })
    const bounds = { type: 'bounds', positions: [[storeOne.latitude, storeOne.longitude], [storeTwo.latitude, storeTwo.longitude]] }
    mapMocks.latLngBounds.mockReturnValue(bounds)

    const { cleanup } = await renderLayer([storeOne, storeTwo])

    expect(mapMocks.latLngBounds).toHaveBeenCalledWith([
      [storeOne.latitude, storeOne.longitude],
      [storeTwo.latitude, storeTwo.longitude]
    ])
    expect(mapMocks.fitBounds).toHaveBeenCalledWith(bounds, { padding: [48, 48], maxZoom: 15 })
    expect(mapMocks.flyTo).not.toHaveBeenCalled()

    await cleanup()
  })
})

describe('MapMarkersLayer marker behavior', () => {
  it('tracks analytics and selects the store when a marker is clicked', async () => {
    mapMocks.getZoom.mockReturnValue(13)
    const store = createStore({ id: 'store-1', slug: 'demo-store', name: 'Demo Store Barmi' })
    const { cleanup, onSelectStore } = await renderLayer([store])

    await clickElement(document.querySelector('button[aria-label="Demo Store Barmi"]'))

    expect(trackBetaEvent).toHaveBeenCalledWith({
      eventName: 'map_pin_click',
      ecosystemSlug: 'demo-ecosystem',
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      metadata: { surface: 'ecosystem_map_pin' }
    })
    expect(onSelectStore).toHaveBeenCalledWith(store.id)

    await cleanup()
  })
})
