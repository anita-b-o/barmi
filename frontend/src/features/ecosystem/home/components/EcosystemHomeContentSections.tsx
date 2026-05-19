import type { HomeCarouselSection } from '../homeSections'
import { ProductGroupCarousel } from './ProductGroupCarousel'
import { StoreGroupCarousel } from './StoreGroupCarousel'
import EmptyState from '@/components/feedback/EmptyState'
import '../../components/ecosystem-marketplace.css'

type EcosystemHomeContentSectionsProps = {
  sections: HomeCarouselSection[]
}

export function EcosystemHomeContentSections({ sections }: EcosystemHomeContentSectionsProps) {
  if (sections.length === 0) {
    return (
      <section className="ecosystem-home-content" aria-label="Exploración del marketplace">
        <div className="ecosystem-home-content__container">
          <EmptyState
            title="Todavía no hay contenido destacado"
            description="Cuando haya productos y tiendas publicados, vas a ver recomendaciones, categorías y accesos para explorar el marketplace."
          />
        </div>
      </section>
    )
  }

  return (
    <section className="ecosystem-home-content" aria-label="Exploración del marketplace">
      <div className="ecosystem-home-content__container">
        {sections.map((section) => (
          section.type === 'product'
            ? <ProductGroupCarousel key={section.id} group={section.group} />
            : <StoreGroupCarousel key={section.id} group={section.group} />
        ))}
      </div>
    </section>
  )
}
