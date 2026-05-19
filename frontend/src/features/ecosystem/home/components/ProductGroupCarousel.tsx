import type { ProductRailGroup } from '../productRails'
import { SectionRail } from '../../components/SectionRail'
import { EmptyCarouselState } from './EmptyCarouselState'
import { ProductCarouselTrack } from './ProductCarouselTrack'

type ProductGroupCarouselProps = {
  group: ProductRailGroup
}

export function ProductGroupCarousel({ group }: ProductGroupCarouselProps) {
  const titleId = `product-rail-${group.id}`

  return (
    <section aria-labelledby={titleId}>
      <SectionRail title={group.title} titleId={titleId} actionHref={group.viewMoreHref}>
      {group.products.length > 0 ? (
        <ProductCarouselTrack groupTitle={group.title} products={group.products} />
      ) : (
        <EmptyCarouselState ctaHref={group.viewMoreHref} ctaLabel="Ver productos" />
      )}
      </SectionRail>
    </section>
  )
}
