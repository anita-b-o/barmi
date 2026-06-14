import { describe, expect, it } from 'vitest'
import { getStoresMapViewportIntent, type StoresMapViewportPoint } from '../viewport'

const defaultCenter: StoresMapViewportPoint = [-34.92145, -57.95453]
const defaultZoom = 13

const storeOne = { id: 'store-1', latitude: -34.920494, longitude: -57.953565 }
const storeTwo = { id: 'store-2', latitude: -34.921332, longitude: -57.95532 }
const storeThree = { id: 'store-3', latitude: -34.922147, longitude: -57.951118 }

function getIntent(
  stores: Array<{ id: string; latitude: number | null; longitude: number | null }>,
  selectedStoreId: string | null
) {
  return getStoresMapViewportIntent({
    stores,
    selectedStoreId,
    defaultCenter,
    defaultZoom
  })
}

describe('stores map viewport intent', () => {
  it('uses the default viewport when there are no stores', () => {
    expect(getIntent([], null)).toEqual({
      type: 'default',
      center: defaultCenter,
      zoom: defaultZoom,
      duration: 0.35
    })
  })

  it('uses the selected store viewport when the selected store is valid', () => {
    expect(getIntent([storeOne, storeTwo], 'store-2')).toEqual({
      type: 'selected-store',
      center: [storeTwo.latitude, storeTwo.longitude],
      minZoom: 15,
      duration: 0.45
    })
  })

  it('uses the single store viewport when selection is invalid and one store is available', () => {
    expect(getIntent([storeOne], 'missing-store')).toEqual({
      type: 'single-store',
      center: [storeOne.latitude, storeOne.longitude],
      zoom: 15,
      duration: 0.45
    })
  })

  it('uses bounds when selection is invalid and multiple stores are available', () => {
    expect(getIntent([storeOne, storeTwo], 'missing-store')).toEqual({
      type: 'bounds',
      positions: [
        [storeOne.latitude, storeOne.longitude],
        [storeTwo.latitude, storeTwo.longitude]
      ],
      padding: [48, 48],
      maxZoom: 15
    })
  })

  it('uses the single store viewport for one store without selection', () => {
    expect(getIntent([storeOne], null)).toEqual({
      type: 'single-store',
      center: [storeOne.latitude, storeOne.longitude],
      zoom: 15,
      duration: 0.45
    })
  })

  it('uses bounds for multiple stores without selection', () => {
    expect(getIntent([storeOne, storeTwo], null)).toEqual({
      type: 'bounds',
      positions: [
        [storeOne.latitude, storeOne.longitude],
        [storeTwo.latitude, storeTwo.longitude]
      ],
      padding: [48, 48],
      maxZoom: 15
    })
  })

  it('prioritizes a valid selected store over bounds', () => {
    expect(getIntent([storeOne, storeTwo, storeThree], 'store-3')).toEqual({
      type: 'selected-store',
      center: [storeThree.latitude, storeThree.longitude],
      minZoom: 15,
      duration: 0.45
    })
  })

  it('ignores stores without valid coordinates before choosing the viewport', () => {
    expect(getIntent([
      { id: 'missing-latitude', latitude: null, longitude: -57.953565 },
      { id: 'missing-longitude', latitude: -34.920494, longitude: null },
      { id: 'not-finite', latitude: Number.NaN, longitude: -57.95532 },
      storeOne
    ], 'missing-latitude')).toEqual({
      type: 'single-store',
      center: [storeOne.latitude, storeOne.longitude],
      zoom: 15,
      duration: 0.45
    })
  })
})
