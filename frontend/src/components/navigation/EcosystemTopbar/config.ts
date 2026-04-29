import { routes } from '@/core/constants/routes'

export type EcosystemNavItem = {
  label: string
  href: string
}

export type EcosystemActionItem = EcosystemNavItem & {
  kind: 'account' | 'orders'
}

export const ecosystemNavItems: EcosystemNavItem[] = [
  { label: 'Mapa', href: routes.ecosystemStoresMap },
  { label: 'Tiendas', href: `${routes.ecosystemHome}#home-section-stores-featured` },
  { label: 'Productos', href: routes.ecosystemCatalog },
  { label: 'Categorias', href: routes.ecosystemStoresMap }
]

export const ecosystemGuestActions: EcosystemActionItem[] = [
  { kind: 'account', label: 'Creá tu cuenta', href: routes.login },
  { kind: 'orders', label: 'Mis compras', href: routes.ecosystemOrders }
]

export function getEcosystemMemberActions(accountLabel: string): EcosystemActionItem[] {
  return [
    { kind: 'account', label: accountLabel, href: routes.adminHome },
    { kind: 'orders', label: 'Mis compras', href: routes.ecosystemOrders }
  ]
}
