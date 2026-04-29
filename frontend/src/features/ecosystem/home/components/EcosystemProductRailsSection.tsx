import type { ProductRailGroup } from '../productRails'
import { ProductGroupCarousel } from './ProductGroupCarousel'
import './EcosystemProductRailsSection.css'

type EcosystemProductRailsSectionProps = {
  groups: ProductRailGroup[]
}

export function EcosystemProductRailsSection({ groups }: EcosystemProductRailsSectionProps) {
  if (groups.length === 0) return null

  return (
    <section className="ecosystem-product-rails" aria-label="Productos del ecosystem">
      <div className="ecosystem-product-rails__container">
        {groups.map((group) => (
          <ProductGroupCarousel key={group.id} group={group} />
        ))}
      </div>
    </section>
  )
}
