import type {
  PublicEcosystemCatalogSort,
  PublicEcosystemStoresMapLocationFilter,
  PublicEcosystemStoresMapSort
} from '@/api/contracts/v1/public'

const catalogSorts = new Set<PublicEcosystemCatalogSort>([
  'default',
  'relevance',
  'name,asc',
  'name,desc',
  'price,asc',
  'price,desc'
])

const storesMapLocations = new Set<PublicEcosystemStoresMapLocationFilter>(['mapped', 'all'])
const storesMapSorts = new Set<PublicEcosystemStoresMapSort>(['name,asc', 'name,desc', 'recent'])

export const DEFAULT_ECOSYSTEM_CATALOG_PAGE = 0
export const DEFAULT_ECOSYSTEM_CATALOG_PAGE_SIZE = 24

export type EcosystemCatalogFilters = {
  query: string
  sort: PublicEcosystemCatalogSort
  deliverySupported: boolean
  page: number
  size: number
}

export type EcosystemStoresMapFilters = {
  query: string
  category: string
  location: PublicEcosystemStoresMapLocationFilter
  sort: PublicEcosystemStoresMapSort
  selectedStoreId: string | null
}

type EcosystemCatalogFiltersInput = {
  query?: string | null
  sort?: string | null
  deliverySupported?: boolean | string | null
  page?: number | string | null
  size?: number | string | null
}

type EcosystemStoresMapFiltersInput = {
  query?: string | null
  category?: string | null
  location?: string | null
  sort?: string | null
  selectedStoreId?: string | null
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCatalogSort(value: string | null | undefined): PublicEcosystemCatalogSort {
  return catalogSorts.has(value as PublicEcosystemCatalogSort)
    ? value as PublicEcosystemCatalogSort
    : 'default'
}

function normalizeNonNegativeInteger(value: number | string | null | undefined, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.floor(numeric))
}

function normalizePositiveInteger(value: number | string | null | undefined, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < 1) return fallback
  return Math.floor(numeric)
}

function normalizeStoresMapLocation(value: string | null | undefined): PublicEcosystemStoresMapLocationFilter {
  return storesMapLocations.has(value as PublicEcosystemStoresMapLocationFilter)
    ? value as PublicEcosystemStoresMapLocationFilter
    : 'mapped'
}

function normalizeStoresMapSort(value: string | null | undefined): PublicEcosystemStoresMapSort {
  return storesMapSorts.has(value as PublicEcosystemStoresMapSort)
    ? value as PublicEcosystemStoresMapSort
    : 'name,asc'
}

export function normalizeEcosystemCatalogFilters(input: EcosystemCatalogFiltersInput = {}): EcosystemCatalogFilters {
  return {
    query: normalizeText(input.query),
    sort: normalizeCatalogSort(input.sort),
    deliverySupported: input.deliverySupported === true || input.deliverySupported === 'true',
    page: normalizeNonNegativeInteger(input.page, DEFAULT_ECOSYSTEM_CATALOG_PAGE),
    size: normalizePositiveInteger(input.size, DEFAULT_ECOSYSTEM_CATALOG_PAGE_SIZE)
  }
}

export function normalizeEcosystemStoresMapFilters(input: EcosystemStoresMapFiltersInput = {}): EcosystemStoresMapFilters {
  const selectedStoreId = normalizeText(input.selectedStoreId)

  return {
    query: normalizeText(input.query),
    category: normalizeText(input.category),
    location: normalizeStoresMapLocation(input.location),
    sort: normalizeStoresMapSort(input.sort),
    selectedStoreId: selectedStoreId || null
  }
}

export const ecosystemDiscoveryQueryKeys = {
  publicEcosystem: (slug: string) => ['public-ecosystem', slug] as const,
  home: (slug: string) => ['public-ecosystem-home', slug] as const,
  products: (slug: string, filters: EcosystemCatalogFiltersInput = {}) => {
    const normalized = normalizeEcosystemCatalogFilters(filters)
    return [
      'public-ecosystem-products',
      slug,
      normalized.query,
      normalized.sort,
      normalized.deliverySupported,
      normalized.page,
      normalized.size
    ] as const
  },
  storesMap: (slug: string, filters: EcosystemStoresMapFiltersInput = {}) => {
    const normalized = normalizeEcosystemStoresMapFilters(filters)
    return [
      'public-ecosystem-stores-map',
      slug,
      normalized.query,
      normalized.category,
      normalized.location,
      normalized.sort
    ] as const
  }
}
