export type PublicStoreCapability =
  | 'ABOUT'
  | 'GALLERY'
  | 'BLOG'
  | 'PRODUCTS'
  | 'RESERVATIONS'
  | 'PROMOTIONS'
  | 'SHIPPING'
  | 'CHECKOUT'
  | 'CONTACT'

export type PublicStoreAppearancePreset =
  | 'MODERN'
  | 'CLASSIC'
  | 'LOCAL_BUSINESS'
  | 'PORTFOLIO'

export type PublicStorePalette =
  | 'CORAL'
  | 'OCEAN'
  | 'FOREST'
  | 'GRAPHITE'

export type PublicStoreShape =
  | 'SQUARE'
  | 'ROUNDED'
  | 'SOFT'

export type PublicStore = {
  slug: string
  id: string
  name: string
  appearance: PublicStoreAppearancePreset
  palette?: PublicStorePalette
  shape?: PublicStoreShape
  profile: PublicStoreProfile
  branding: PublicStoreBranding
  capabilities: PublicStoreCapability[]
  categories: PublicStoreCategory[]
  promotions: PublicStorePromotion[]
}

export type PublicStoreProfile = {
  description: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
}

export type PublicStoreBranding = {
  logoUrl: string | null
  bannerUrl: string | null
  primaryColor: string
  secondaryColor: string
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

export type PublicEcosystemProductsPage = {
  content: PublicEcosystemProduct[]
  page: number
  size: number
  totalElements: number
  totalPages: number
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

export type PublicEcosystemCatalogSort = 'default' | 'relevance' | 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc'

export type PublicProduct = {
  priceCents: number
  id: string
  slug: string
  name: string
  sku: string
  stockQuantity: number
  isAvailable: boolean
  categoryId: string | null
  categoryName: string | null
}

export type PublicStoreProductDetail = {
  store: {
    slug: string
    name: string
    categoryName: string | null
    appearance: PublicStoreAppearancePreset
    palette?: PublicStorePalette
    shape?: PublicStoreShape
    branding: PublicStoreBranding
    capabilities: PublicStoreCapability[]
  }
  product: {
    slug: string
    name: string
    priceCents: number
    currency: string
    isAvailable: boolean
    stockQuantity: number
    categoryName: string | null
    description: string | null
    imageUrl: string | null
    sku: string | null
  }
}

export type PublicProductsPage = {
  content: PublicProduct[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type PublicStoreCatalogSort = 'default' | 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc'
