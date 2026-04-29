import { routes } from '@/core/constants/routes'

export type HeroBannerItem = {
  id: string
  src: string
  alt: string
}

export type QuickAccessIcon = 'map' | 'stores' | 'products' | 'categories'

export type QuickAccessItem = {
  id: string
  title: string
  description?: string
  ctaLabel: string
  href: string
  icon: QuickAccessIcon
  variant?: 'default' | 'featured'
}

export const ecosystemHomeBannerItems: HeroBannerItem[] = []

export const ecosystemHomeQuickAccessItems: QuickAccessItem[] = [
  {
    id: 'map',
    title: 'Mapa',
    description: 'Visitá las tiendas físicas de tus negocios favoritos.',
    ctaLabel: 'Ir a mapa',
    href: routes.ecosystemStoresMap,
    icon: 'map'
  },
  {
    id: 'stores',
    title: 'Tiendas',
    description: 'Encontrá todas las tiendas parte de la familia Barmi.',
    ctaLabel: 'Ir a tiendas',
    href: routes.ecosystemStoresMap,
    icon: 'stores'
  },
  {
    id: 'products',
    title: 'Productos',
    description: 'Descubrí todos los productos disponibles en Barmi.',
    ctaLabel: 'Ir a productos',
    href: routes.ecosystemCatalog,
    icon: 'products',
    variant: 'featured'
  },
  {
    id: 'categories',
    title: 'Categorias',
    description: 'Descubrí todas las categorías que tenemos para ofrecer.',
    ctaLabel: 'Ir a categorías',
    href: routes.ecosystemStoresMap,
    icon: 'categories'
  }
]
