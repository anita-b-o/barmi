import type { ProductRailGroup } from '../productRails'
import { EmptyCarouselState } from './EmptyCarouselState'
import { ProductCarouselHeader } from './ProductCarouselHeader'
import { ProductCarouselTrack } from './ProductCarouselTrack'

type ProductGroupCarouselProps = {
  group: ProductRailGroup
}

export function ProductGroupCarousel({ group }: ProductGroupCarouselProps) {
  const titleId = `product-rail-${group.id}`

  return (
    <section className="ecosystem-product-rails__group" aria-labelledby={titleId}>
      <ProductCarouselHeader title={group.title} titleId={titleId} viewMoreHref={group.viewMoreHref} />
      {group.products.length > 0 ? (
        <ProductCarouselTrack groupTitle={group.title} products={group.products} />
      ) : (
        <EmptyCarouselState ctaHref={group.viewMoreHref} ctaLabel="Ver productos" />
      )}
    </section>
  )
}
