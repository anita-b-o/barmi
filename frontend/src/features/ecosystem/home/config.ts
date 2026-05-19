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
    description: 'Entrá por zona y elegí una tienda real antes de comprar.',
    ctaLabel: 'Ir a mapa',
    href: routes.ecosystemStoresMap,
    icon: 'map'
  },
  {
    id: 'stores',
    title: 'Tiendas',
    description: 'Compará tiendas del ecosystem y entrá a su catálogo propio.',
    ctaLabel: 'Ir a tiendas',
    href: routes.ecosystemStoresMap,
    icon: 'stores'
  },
  {
    id: 'products',
    title: 'Productos',
    description: 'Buscá productos del marketplace y pasalos al carrito ecosystem.',
    ctaLabel: 'Ir a productos',
    href: routes.ecosystemCatalog,
    icon: 'products',
    variant: 'featured'
  },
  {
    id: 'categories',
    title: 'Categorías',
    description: 'Usá categorías frecuentes cuando todavía no sabés qué tienda abrir.',
    ctaLabel: 'Ir a categorías',
    href: routes.ecosystemStoresMap,
    icon: 'categories'
  }
]
