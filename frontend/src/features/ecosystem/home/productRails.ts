import { routes } from '@/core/constants/routes'
import type { PublicEcosystemHome, PublicEcosystemProduct } from '../../../api/contracts/v1/public'

export type ProductRailProduct = {
  id: string
  name: string
  href: string
  imageUrl?: string | null
  imageAlt: string
  priceAmount: number | null
  currency: string | null
  storeId?: string | null
  storeName?: string | null
}

export type ProductRailGroup = {
  id: string
  title: string
  filterKey: string
  viewMoreHref: string
  products: ProductRailProduct[]
}

const MAX_PRODUCTS_PER_GROUP = 15

type BuildProductRailGroupsInput = {
  home: PublicEcosystemHome | null
  products: PublicEcosystemProduct[]
}

type ProductRailCriterion =
  | 'all'
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'promotions'
  | 'delivery'
  | 'reverse'
  | 'technology'
  | 'home'
  | 'fashion'
  | 'general-belgrano'
  | 'la-plata'

type ProductRailDefinition = {
  id: string
  title: string
  filterKey: string
  criterion: ProductRailCriterion
  viewMoreHref: string
}

const productRailDefinitions: ProductRailDefinition[] = [
  { id: 'similar-purchases', title: 'Productos similares a tus compras', filterKey: 'similar-purchases', criterion: 'all', viewMoreHref: buildCatalogHref() },
  { id: 'relevant', title: 'Productos relevantes', filterKey: 'relevant', criterion: 'name-asc', viewMoreHref: buildCatalogHref({ sort: 'name,asc' }) },
  { id: 'featured', title: 'Productos destacados', filterKey: 'featured', criterion: 'promotions', viewMoreHref: buildCatalogHref() },
  { id: 'weekly-offers', title: 'Ofertas de la semana', filterKey: 'weekly-offers', criterion: 'promotions', viewMoreHref: buildCatalogHref() },
  { id: 'recommended', title: 'Productos recomendados', filterKey: 'recommended', criterion: 'all', viewMoreHref: buildCatalogHref() },
  { id: 'new-products', title: 'Novedades del marketplace', filterKey: 'new-products', criterion: 'reverse', viewMoreHref: buildCatalogHref() },
  { id: 'best-sellers', title: 'Más vendidos', filterKey: 'best-sellers', criterion: 'price-desc', viewMoreHref: buildCatalogHref({ sort: 'price,desc' }) },
  { id: 'delivery', title: 'Productos con entrega', filterKey: 'delivery:true', criterion: 'delivery', viewMoreHref: buildCatalogHref({ deliverySupported: true }) },
  { id: 'low-price', title: 'Precios bajos para explorar', filterKey: 'price:asc', criterion: 'price-asc', viewMoreHref: buildCatalogHref({ sort: 'price,asc' }) },
  { id: 'premium', title: 'Selección premium', filterKey: 'price:desc', criterion: 'price-desc', viewMoreHref: buildCatalogHref({ sort: 'price,desc' }) },
  { id: 'technology', title: 'Productos de tecnología', filterKey: 'category:technology', criterion: 'technology', viewMoreHref: buildCatalogHref({ query: 'tecnología' }) },
  { id: 'home', title: 'Productos de hogar', filterKey: 'category:home', criterion: 'home', viewMoreHref: buildCatalogHref({ query: 'hogar' }) },
  { id: 'fashion', title: 'Productos de indumentaria', filterKey: 'category:fashion', criterion: 'fashion', viewMoreHref: buildCatalogHref({ query: 'indumentaria' }) },
  { id: 'general-belgrano', title: 'Productos en General Belgrano', filterKey: 'location:general-belgrano', criterion: 'general-belgrano', viewMoreHref: buildCatalogHref({ query: 'General Belgrano' }) },
  { id: 'la-plata', title: 'Productos en La Plata', filterKey: 'location:la-plata', criterion: 'la-plata', viewMoreHref: buildCatalogHref({ query: 'La Plata' }) },
  { id: 'essentials', title: 'Esenciales para comprar hoy', filterKey: 'essentials', criterion: 'all', viewMoreHref: buildCatalogHref() },
  { id: 'popular-nearby', title: 'Populares cerca tuyo', filterKey: 'nearby:popular', criterion: 'delivery', viewMoreHref: buildCatalogHref({ deliverySupported: true }) },
  { id: 'name-z-a', title: 'También te puede interesar', filterKey: 'name:desc', criterion: 'name-desc', viewMoreHref: buildCatalogHref({ sort: 'name,desc' }) },
  { id: 'last-chance', title: 'Últimas oportunidades', filterKey: 'last-chance', criterion: 'reverse', viewMoreHref: buildCatalogHref() },
  { id: 'marketplace-picks', title: 'Elegidos por Barmi', filterKey: 'marketplace-picks', criterion: 'all', viewMoreHref: buildCatalogHref() }
]

function buildCatalogHref(options: { query?: string; sort?: string; deliverySupported?: boolean } = {}) {
  const params = new URLSearchParams()
  if (options.query?.trim()) params.set('q', options.query.trim())
  if (options.sort && options.sort !== 'default') params.set('sort', options.sort)
  if (options.deliverySupported !== undefined) params.set('deliverySupported', String(options.deliverySupported))
  const queryString = params.toString()
  return queryString ? `${routes.ecosystemCatalog}?${queryString}` : routes.ecosystemCatalog
}

function uniqueProducts(products: PublicEcosystemProduct[]) {
  const byId = new Map<string, PublicEcosystemProduct>()
  products.forEach((product) => {
    if (!byId.has(product.id)) byId.set(product.id, product)
  })
  return Array.from(byId.values())
}

function toRailProduct(product: PublicEcosystemProduct): ProductRailProduct {
  return {
    id: product.id,
    name: product.name,
    href: buildCatalogHref({ query: product.name }),
    imageUrl: null,
    imageAlt: product.name,
    priceAmount: product.priceAmount,
    currency: product.currency,
    storeId: null,
    storeName: null
  }
}

function withLimit(group: ProductRailGroup): ProductRailGroup {
  return {
    ...group,
    products: group.products.slice(0, MAX_PRODUCTS_PER_GROUP)
  }
}

function byText(products: PublicEcosystemProduct[], terms: string[]) {
  const normalizedTerms = terms.map((term) => term.toLowerCase())
  return products.filter((product) => normalizedTerms.some((term) => product.name.toLowerCase().includes(term)))
}

function selectProducts(
  criterion: ProductRailCriterion,
  allProducts: PublicEcosystemProduct[],
  promotionProducts: PublicEcosystemProduct[]
) {
  switch (criterion) {
    case 'name-asc':
      return [...allProducts].sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return [...allProducts].sort((a, b) => b.name.localeCompare(a.name))
    case 'price-asc':
      return [...allProducts].sort((a, b) => a.priceAmount - b.priceAmount)
    case 'price-desc':
      return [...allProducts].sort((a, b) => b.priceAmount - a.priceAmount)
    case 'promotions':
      return promotionProducts
    case 'delivery':
      return allProducts.filter((product) => product.deliverySupported)
    case 'reverse':
      return [...allProducts].reverse()
    case 'technology':
      return byText(allProducts, ['tech', 'tecnología', 'tecnologia', 'cable', 'audio', 'smart'])
    case 'home':
      return byText(allProducts, ['hogar', 'home', 'cocina', 'mesa', 'silla', 'secador'])
    case 'fashion':
      return byText(allProducts, ['ropa', 'indumentaria', 'camisa', 'remera', 'pantalon', 'pantalón'])
    case 'general-belgrano':
      return []
    case 'la-plata':
      return []
    case 'all':
    default:
      return allProducts
  }
}

export function buildEcosystemProductRailGroups({
  home,
  products
}: BuildProductRailGroupsInput): ProductRailGroup[] {
  const allProducts = uniqueProducts([
    ...products,
    ...(home?.promotionProducts ?? []),
    ...(home?.deliveryProducts ?? [])
  ])
  const promotionProducts = uniqueProducts(home?.promotionProducts ?? [])

  return productRailDefinitions.map((definition) => withLimit({
    id: definition.id,
    title: definition.title,
    filterKey: definition.filterKey,
    viewMoreHref: definition.viewMoreHref,
    products: selectProducts(definition.criterion, allProducts, promotionProducts).map(toRailProduct)
  }))
}
