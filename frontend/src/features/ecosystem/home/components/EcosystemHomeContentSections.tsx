import type { HomeCarouselSection } from '../homeSections'
import { ProductGroupCarousel } from './ProductGroupCarousel'
import { StoreGroupCarousel } from './StoreGroupCarousel'
import './EcosystemProductRailsSection.css'
import './EcosystemStoreRailsSection.css'
import './EcosystemHomeContentSections.css'

type EcosystemHomeContentSectionsProps = {
  sections: HomeCarouselSection[]
}

export function EcosystemHomeContentSections({ sections }: EcosystemHomeContentSectionsProps) {
  if (sections.length === 0) return null

  return (
    <section className="ecosystem-home-content" aria-label="Exploración del marketplace">
      <div className="ecosystem-home-content__container">
        {sections.map((section) => (
          <div
            key={section.id}
            className={section.type === 'product' ? 'ecosystem-product-rails' : 'ecosystem-store-rails'}
          >
            <div className={section.type === 'product' ? 'ecosystem-product-rails__container' : 'ecosystem-store-rails__container'}>
              {section.type === 'product'
                ? <ProductGroupCarousel group={section.group} />
                : <StoreGroupCarousel group={section.group} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
