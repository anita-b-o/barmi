import type { StoreRailGroup } from '../storeRails'
import { StoreGroupCarousel } from './StoreGroupCarousel'
import './EcosystemStoreRailsSection.css'

type EcosystemStoreRailsSectionProps = {
  groups: StoreRailGroup[]
}

export function EcosystemStoreRailsSection({ groups }: EcosystemStoreRailsSectionProps) {
  if (groups.length === 0) return null

  return (
    <section className="ecosystem-store-rails" aria-label="Tiendas del ecosystem">
      <div className="ecosystem-store-rails__container">
        {groups.map((group) => (
          <StoreGroupCarousel key={group.id} group={group} />
        ))}
      </div>
    </section>
  )
}
