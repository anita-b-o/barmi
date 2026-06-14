import { describe, expect, it } from 'vitest'
import { getValidStoresMapSelection } from '../selection'

const stores = [
  { id: 'store-1' },
  { id: 'store-2' }
]

describe('stores map selection', () => {
  it('keeps a selected store id when it exists in the current results', () => {
    expect(getValidStoresMapSelection({
      stores,
      selectedStoreId: 'store-2',
      isFilteredMode: true
    })).toBe('store-2')
  })

  it('falls back to the first store when the selected store is invalid in filtered mode', () => {
    expect(getValidStoresMapSelection({
      stores,
      selectedStoreId: 'missing-store',
      isFilteredMode: true
    })).toBe('store-1')
  })

  it('falls back to the first store when filtered results have no selected store id', () => {
    expect(getValidStoresMapSelection({
      stores,
      selectedStoreId: null,
      isFilteredMode: true
    })).toBe('store-1')
  })

  it('returns null when filtered results are empty', () => {
    expect(getValidStoresMapSelection({
      stores: [],
      selectedStoreId: null,
      isFilteredMode: true
    })).toBeNull()
  })

  it('does not auto-select a store in explore mode', () => {
    expect(getValidStoresMapSelection({
      stores,
      selectedStoreId: null,
      isFilteredMode: false
    })).toBeNull()
  })

  it('returns null for an invalid selected store in explore mode', () => {
    expect(getValidStoresMapSelection({
      stores,
      selectedStoreId: 'missing-store',
      isFilteredMode: false
    })).toBeNull()
  })

  it('updates the fallback when the current results list changes', () => {
    expect(getValidStoresMapSelection({
      stores: [{ id: 'store-3' }],
      selectedStoreId: 'store-1',
      isFilteredMode: true
    })).toBe('store-3')
  })
})
