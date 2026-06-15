import type { StoreReadiness } from '@/api/contracts/v1/storeAdmin'

export function isEcommerceReadiness(readiness: StoreReadiness | null | undefined) {
  const enabled = readiness?.enabledCapabilities ?? []
  return enabled.includes('PRODUCTS') || enabled.includes('SHIPPING') || enabled.includes('CHECKOUT')
}

export function readinessTitle(readiness: StoreReadiness | null | undefined) {
  return isEcommerceReadiness(readiness) ? 'Prepará tu tienda online' : 'Prepará tu sitio'
}
