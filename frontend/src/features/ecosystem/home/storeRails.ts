import { routes } from '@/core/constants/routes'
import type {
  PublicEcosystemHome,
  PublicEcosystemProduct,
  PublicStoreMapStore,
  PublicStoreSummary
} from '../../../api/contracts/v1/public'

export type StoreRailProductPreview = {
  id: string
  imageUrl?: string | null
  alt: string
  href: string
}

export type StoreRailStore = {
  id: string
  name: string
  storeHref: string
  storeProductsHref: string
  logoUrl?: string | null
  categoryLabel?: string | null
  featuredProducts: StoreRailProductPreview[]
}

export type StoreRailGroup = {
  id: string
  title: string
  filterKey: string
  viewMoreHref: string
  stores: StoreRailStore[]
}

const MAX_STORES_PER_GROUP = 15
const PRODUCT_PREVIEW_COUNT = 3

type BuildStoreRailGroupsInput = {
  home: PublicEcosystemHome | null
  mapStores: PublicStoreMapStore[]
  products: PublicEcosystemProduct[]
}

type StoreSeed = {
  id: string
  slug: string
  name: string
  categoryKey?: string | null
  categoryLabel?: string | null
  locationLabel?: string | null
}

type StoreRailCriterion =
  | 'recommended'
  | 'new'
  | 'mapped'
  | 'unmapped'
  | 'alphabetical'
  | 'recent'
  | 'category-first'
  | 'category-second'
  | 'location-first'
  | 'location-second'

type StoreRailDefinition = {
  id: string
  title: string
  filterKey: string
  criterion: StoreRailCriterion
  viewMoreHref: string
}

function normalizeStoreSeed(store: PublicStoreSummary | PublicStoreMapStore): StoreSeed {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    categoryKey: store.category?.key ?? null,
    categoryLabel: store.category?.label ?? null,
    locationLabel: 'locationLabel' in store ? store.locationLabel : null
  }
}

function mergeStores(home: PublicEcosystemHome | null, mapStores: PublicStoreMapStore[]): StoreSeed[] {
  const stores = new Map<string, StoreSeed>()

  mapStores.forEach((store) => {
    stores.set(store.id, normalizeStoreSeed(store))
  })

  home?.newStores.forEach((store) => {
    const current = stores.get(store.id)
    stores.set(store.id, {
      ...normalizeStoreSeed(store),
      locationLabel: current?.locationLabel ?? null
    })
  })

  return Array.from(stores.values())
}

function buildProductPreviews(store: StoreSeed, products: PublicEcosystemProduct[]): StoreRailProductPreview[] {
  const storeHref = routes.publicStore(store.slug)
  const previews = products.slice(0, PRODUCT_PREVIEW_COUNT).map((product) => ({
    id: `${store.id}-${product.id}`,
    imageUrl: null,
    alt: product.name,
    href: storeHref
  }))

  while (previews.length < PRODUCT_PREVIEW_COUNT) {
    previews.push({
      id: `${store.id}-fallback-${previews.length + 1}`,
      imageUrl: null,
      alt: `${store.name} producto destacado ${previews.length + 1}`,
      href: storeHref
    })
  }

  return previews
}

function toRailStore(store: StoreSeed, products: PublicEcosystemProduct[]): StoreRailStore {
  const storeHref = routes.publicStore(store.slug)

  return {
    id: store.id,
    name: store.name,
    storeHref,
    storeProductsHref: `${storeHref}#productos`,
    logoUrl: null,
    categoryLabel: store.categoryLabel ?? null,
    featuredProducts: buildProductPreviews(store, products)
  }
}

function withLimit(group: StoreRailGroup): StoreRailGroup {
  return {
    ...group,
    stores: group.stores.slice(0, MAX_STORES_PER_GROUP)
  }
}

function buildCategoryHref(categoryKey: string) {
  return `${routes.ecosystemStoresMap}?category=${encodeURIComponent(categoryKey)}&location=all`
}

function buildLocationHref(locationLabel: string) {
  return `${routes.ecosystemStoresMap}?location=all&q=${encodeURIComponent(locationLabel)}`
}

function buildStoreRailDefinitions(home: PublicEcosystemHome | null, seeds: StoreSeed[]): StoreRailDefinition[] {
  const categories = home?.storeCategories ?? []
  const locations = Array.from(new Set(seeds.map((store) => store.locationLabel).filter(Boolean))) as string[]
  const firstCategory = categories[0]
  const secondCategory = categories[1]
  const firstLocation = locations[0]
  const secondLocation = locations[1]

  return [
    { id: 'recommended', title: 'Tiendas recomendadas', filterKey: 'recommended', criterion: 'recommended', viewMoreHref: routes.ecosystemStoresMap },
    { id: 'featured', title: 'Tiendas destacadas', filterKey: 'featured', criterion: 'recommended', viewMoreHref: routes.ecosystemStoresMap },
    { id: 'new', title: 'Tiendas nuevas', filterKey: 'new', criterion: 'new', viewMoreHref: routes.ecosystemStoresMap },
    { id: 'mapped', title: 'Tiendas con presencia local', filterKey: 'location:mapped', criterion: 'mapped', viewMoreHref: routes.ecosystemStoresMap },
    { id: 'without-map', title: 'Tiendas para descubrir online', filterKey: 'location:unmapped', criterion: 'unmapped', viewMoreHref: `${routes.ecosystemStoresMap}?location=all` },
    { id: 'alphabetical', title: 'Tiendas de la A a la Z', filterKey: 'name:asc', criterion: 'alphabetical', viewMoreHref: routes.ecosystemStoresMap },
    { id: 'category-primary', title: firstCategory ? `Tiendas de ${firstCategory.label.toLowerCase()}` : 'Tiendas de indumentaria', filterKey: firstCategory ? `category:${firstCategory.key}` : 'category:indumentaria', criterion: 'category-first', viewMoreHref: firstCategory ? buildCategoryHref(firstCategory.key) : buildCategoryHref('indumentaria') },
    { id: 'category-secondary', title: secondCategory ? `Tiendas de ${secondCategory.label.toLowerCase()}` : 'Tiendas de tecnología', filterKey: secondCategory ? `category:${secondCategory.key}` : 'category:tecnologia', criterion: 'category-second', viewMoreHref: secondCategory ? buildCategoryHref(secondCategory.key) : buildCategoryHref('tecnologia') },
    { id: 'location-primary', title: firstLocation ? `Tiendas en ${firstLocation}` : 'Tiendas en General Belgrano', filterKey: firstLocation ? `location:${firstLocation}` : 'location:general-belgrano', criterion: 'location-first', viewMoreHref: firstLocation ? buildLocationHref(firstLocation) : buildLocationHref('General Belgrano') },
    { id: 'location-secondary', title: secondLocation ? `Tiendas en ${secondLocation}` : 'Tiendas en La Plata', filterKey: secondLocation ? `location:${secondLocation}` : 'location:la-plata', criterion: 'location-second', viewMoreHref: secondLocation ? buildLocationHref(secondLocation) : buildLocationHref('La Plata') }
  ]
}

function selectStores(criterion: StoreRailCriterion, seeds: StoreSeed[], home: PublicEcosystemHome | null) {
  const categories = home?.storeCategories ?? []
  const locations = Array.from(new Set(seeds.map((store) => store.locationLabel).filter(Boolean))) as string[]

  switch (criterion) {
    case 'new':
    case 'recent':
      return [...seeds].reverse()
    case 'mapped':
      return seeds.filter((store) => Boolean(store.locationLabel))
    case 'unmapped':
      return seeds.filter((store) => !store.locationLabel)
    case 'alphabetical':
      return [...seeds].sort((a, b) => a.name.localeCompare(b.name))
    case 'category-first':
      return categories[0] ? seeds.filter((store) => store.categoryKey === categories[0].key) : []
    case 'category-second':
      return categories[1] ? seeds.filter((store) => store.categoryKey === categories[1].key) : []
    case 'location-first':
      return locations[0] ? seeds.filter((store) => store.locationLabel === locations[0]) : []
    case 'location-second':
      return locations[1] ? seeds.filter((store) => store.locationLabel === locations[1]) : []
    case 'recommended':
    default:
      return seeds
  }
}

export function buildEcosystemStoreRailGroups({
  home,
  mapStores,
  products
}: BuildStoreRailGroupsInput): StoreRailGroup[] {
  const seeds = mergeStores(home, mapStores)
  return buildStoreRailDefinitions(home, seeds).map((definition) => withLimit({
    id: definition.id,
    title: definition.title,
    filterKey: definition.filterKey,
    viewMoreHref: definition.viewMoreHref,
    stores: selectStores(definition.criterion, seeds, home).map((store) => toRailStore(store, products))
  }))
}
