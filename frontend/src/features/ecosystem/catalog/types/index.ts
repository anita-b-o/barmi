import type { PublicEcosystem, PublicEcosystemProduct } from '../../../../api/contracts/v1/public'

export type EcosystemCatalogViewModel = {
  ecosystem: PublicEcosystem
  products: PublicEcosystemProduct[]
  query: string
}
