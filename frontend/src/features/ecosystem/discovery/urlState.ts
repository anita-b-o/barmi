import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  PublicEcosystemCatalogSort,
  PublicEcosystemStoresMapLocationFilter
} from '@/api/contracts/v1/public'
import {
  normalizeEcosystemCatalogFilters,
  normalizeEcosystemStoresMapFilters,
  type EcosystemCatalogFilters,
  type EcosystemStoresMapFilters
} from './index'

type CatalogUrlUpdates = {
  q?: string
  sort?: PublicEcosystemCatalogSort | string
  deliverySupported?: boolean | string
  page?: number | string
}

type StoresMapUrlUpdates = {
  q?: string
  category?: string
  location?: PublicEcosystemStoresMapLocationFilter | string
}

function setOrDelete(next: URLSearchParams, key: string, value: string) {
  if (value) next.set(key, value)
  else next.delete(key)
}

export function readEcosystemCatalogUrlState(searchParams: URLSearchParams): EcosystemCatalogFilters {
  return normalizeEcosystemCatalogFilters({
    query: searchParams.get('q'),
    sort: searchParams.get('sort'),
    deliverySupported: searchParams.get('deliverySupported'),
    page: searchParams.get('page')
  })
}

export function buildEcosystemCatalogSearchParams(
  searchParams: URLSearchParams,
  updates: CatalogUrlUpdates
) {
  const next = new URLSearchParams(searchParams)
  const current = readEcosystemCatalogUrlState(searchParams)
  const filters = normalizeEcosystemCatalogFilters({
    query: updates.q ?? current.query,
    sort: updates.sort ?? current.sort,
    deliverySupported: updates.deliverySupported ?? current.deliverySupported,
    page: updates.page ?? current.page
  })

  setOrDelete(next, 'q', filters.query)
  if (filters.sort === 'default') next.delete('sort')
  else next.set('sort', filters.sort)
  if (filters.deliverySupported) next.set('deliverySupported', 'true')
  else next.delete('deliverySupported')
  if (
    updates.page === undefined &&
    (updates.q !== undefined || updates.sort !== undefined || updates.deliverySupported !== undefined)
  ) {
    next.delete('page')
  } else if (filters.page > 0) {
    next.set('page', String(filters.page))
  } else {
    next.delete('page')
  }

  return next
}

export function clearEcosystemCatalogSearchParams(searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete('q')
  next.delete('sort')
  next.delete('deliverySupported')
  next.delete('page')
  return next
}

export function readEcosystemStoresMapUrlState(searchParams: URLSearchParams): EcosystemStoresMapFilters {
  return normalizeEcosystemStoresMapFilters({
    query: searchParams.get('q'),
    category: searchParams.get('category'),
    location: searchParams.get('location'),
    selectedStoreId: searchParams.get('store')
  })
}

export function buildEcosystemStoresMapSearchParams(
  searchParams: URLSearchParams,
  updates: StoresMapUrlUpdates
) {
  const next = new URLSearchParams(searchParams)
  const current = readEcosystemStoresMapUrlState(searchParams)
  const filters = normalizeEcosystemStoresMapFilters({
    query: updates.q ?? current.query,
    category: updates.category ?? current.category,
    location: updates.location ?? current.location,
    selectedStoreId: current.selectedStoreId
  })

  setOrDelete(next, 'q', filters.query)
  setOrDelete(next, 'category', filters.category)
  if (filters.location === 'mapped') next.delete('location')
  else next.set('location', filters.location)

  if (updates.q !== undefined || updates.category !== undefined || updates.location !== undefined) {
    next.delete('store')
  }

  return next
}

export function buildEcosystemStoresMapSelectionSearchParams(
  searchParams: URLSearchParams,
  storeId: string
) {
  const next = new URLSearchParams(searchParams)
  const normalized = normalizeEcosystemStoresMapFilters({ selectedStoreId: storeId })
  if (normalized.selectedStoreId) next.set('store', normalized.selectedStoreId)
  else next.delete('store')
  return next
}

export function clearEcosystemStoresMapSelectionSearchParams(searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete('store')
  return next
}

export function useEcosystemCatalogUrlState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEcosystemCatalogUrlState(searchParams)

  const updateParams = useCallback((updates: CatalogUrlUpdates) => {
    setSearchParams((current) => buildEcosystemCatalogSearchParams(current, updates))
  }, [setSearchParams])

  const clearFilters = useCallback(() => {
    setSearchParams((current) => clearEcosystemCatalogSearchParams(current))
  }, [setSearchParams])

  return {
    searchParams,
    filters,
    query: filters.query,
    sort: filters.sort,
    deliverySupportedOnly: filters.deliverySupported,
    page: filters.page,
    size: filters.size,
    updateParams,
    clearFilters
  }
}

export function useEcosystemStoresMapUrlState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readEcosystemStoresMapUrlState(searchParams)

  const updateParams = useCallback((updates: StoresMapUrlUpdates) => {
    setSearchParams((current) => buildEcosystemStoresMapSearchParams(current, updates))
  }, [setSearchParams])

  const selectStore = useCallback((storeId: string) => {
    setSearchParams((current) => buildEcosystemStoresMapSelectionSearchParams(current, storeId))
  }, [setSearchParams])

  const clearInvalidSelection = useCallback(() => {
    setSearchParams((current) => clearEcosystemStoresMapSelectionSearchParams(current), { replace: true })
  }, [setSearchParams])

  return {
    searchParams,
    filters,
    query: filters.query,
    category: filters.category,
    location: filters.location,
    selectedStoreId: filters.selectedStoreId,
    updateParams,
    selectStore,
    clearInvalidSelection
  }
}
