import { routes } from '@/core/constants/routes'

export type MapExploreItem = {
  id: string
  label: string
  query: string
  href?: string
}

export type MapExploreGroup = {
  id: string
  title: string
  icon: 'near' | 'fashion' | 'food' | 'bazaar' | 'hotel'
  query: string
  items: MapExploreItem[]
  viewMoreHref?: string
}

export const mapExploreGroups: MapExploreGroup[] = [
  {
    id: 'near-me',
    title: 'Cerca de mí',
    icon: 'near',
    query: 'cerca de mi',
    items: []
  },
  {
    id: 'fashion',
    title: 'Indumentaria',
    icon: 'fashion',
    query: 'indumentaria',
    viewMoreHref: `${routes.ecosystemStoresMap}?q=indumentaria`,
    items: [
      { id: 'fashion-women', label: 'Femenina', query: 'indumentaria femenina' },
      { id: 'fashion-men', label: 'Masculina', query: 'indumentaria masculina' },
      { id: 'fashion-shoes', label: 'Calzados', query: 'calzados' }
    ]
  },
  {
    id: 'restaurants',
    title: 'Restaurantes',
    icon: 'food',
    query: 'restaurantes',
    viewMoreHref: `${routes.ecosystemStoresMap}?q=restaurantes`,
    items: [
      { id: 'burgers', label: 'Hamburguesas', query: 'hamburguesas' },
      { id: 'empanadas', label: 'Empanadas', query: 'empanadas' },
      { id: 'pizza', label: 'Pizza', query: 'pizza' }
    ]
  },
  {
    id: 'bazaar',
    title: 'Bazar',
    icon: 'bazaar',
    query: 'bazar',
    items: []
  },
  {
    id: 'lodging',
    title: 'Hospedaje',
    icon: 'hotel',
    query: 'hospedaje',
    viewMoreHref: `${routes.ecosystemStoresMap}?q=hospedaje`,
    items: [
      { id: 'la-plata', label: 'La Plata', query: 'La Plata' },
      { id: 'brandsen', label: 'Brandsen', query: 'Brandsen' },
      { id: 'general-belgrano', label: 'General Belgrano', query: 'General Belgrano' }
    ]
  }
]
