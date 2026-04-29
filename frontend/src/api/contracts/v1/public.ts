export type PublicStore = {
  slug: string
  id: string
  name: string
  categories: PublicStoreCategory[]
  promotions: PublicStorePromotion[]
}

export type PublicStoreCategory = {
  id: string
  name: string
  sortOrder: number
}

export type PublicStorePromotion = {
  code: string
  type: 'FIXED' | 'PERCENTAGE'
  value: number
  shortLabel: string
  expirationDate: string | null
}

export type PublicEcosystem = {
  id: string
  slug: string
  name: string
  promotions: PublicEcosystemPromotion[]
}

export type PublicStoreSummary = {
  id: string
  slug: string
  name: string
  category: PublicStoreCategorySummary | null
  createdAt: string
}

export type PublicStoreCategorySummary = {
  key: string
  label: string
}

export type PublicStoreCategoryFacet = {
  key: string
  label: string
  storeCount: number
}

export type PublicStoreMapStore = {
  id: string
  slug: string
  name: string
  category: PublicStoreCategorySummary | null
  hasPublicLocation: boolean
  locationLabel: string | null
  latitude: number | null
  longitude: number | null
  createdAt: string
}

export type PublicEcosystemPromotion = {
  code: string
  type: 'FIXED' | 'PERCENTAGE'
  value: number
  shortLabel: string
  expirationDate: string | null
}

export type PublicEcosystemProduct = {
  id: string
  name: string
  priceAmount: number
  currency: string
  deliverySupported: boolean
}

export type PublicEcosystemHome = {
  ecosystem: PublicEcosystem
  newStores: PublicStoreSummary[]
  storeCategories: PublicStoreCategoryFacet[]
  promotionProducts: PublicEcosystemProduct[]
  deliveryProducts: PublicEcosystemProduct[]
}

export type PublicEcosystemStoresMap = {
  ecosystem: PublicEcosystem
  categories: PublicStoreCategoryFacet[]
  stores: PublicStoreMapStore[]
}

export type PublicEcosystemStoresMapLocationFilter = 'mapped' | 'all'
export type PublicEcosystemStoresMapSort = 'name,asc' | 'name,desc' | 'recent'

export type PublicEcosystemCatalogSort = 'default' | 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc'

export type PublicProduct = {
  priceCents: number
  id: string
  name: string
  sku: string
  stockQuantity: number
  isAvailable: boolean
  categoryId: string | null
  categoryName: string | null
}

export type PublicStoreCatalogSort = 'default' | 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc'
