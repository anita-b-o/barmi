import type { ProductRailProduct } from '../productRails'
import { useCarouselTrack } from './useCarouselTrack'
import { ProductCarouselItemCard } from './ProductCarouselItemCard'

type ProductCarouselTrackProps = {
  groupTitle: string
  products: ProductRailProduct[]
}

export function ProductCarouselTrack({ groupTitle, products }: ProductCarouselTrackProps) {
  const {
    canNavigate,
    canScrollNext,
    canScrollPrevious,
    scrollTrack,
    trackRef
  } = useCarouselTrack({
    itemCount: products.length,
    itemSelector: '.ecosystem-product-rails__item-card'
  })

  return (
    <div className="ecosystem-product-rails__carousel-body">
      <div
        ref={trackRef}
        className="ecosystem-product-rails__track"
        aria-label={`Carousel de ${groupTitle}`}
        tabIndex={0}
      >
        {products.map((product) => (
          <ProductCarouselItemCard key={product.id} product={product} />
        ))}
      </div>

      {canNavigate ? (
        <>
          <button
            className="ecosystem-product-rails__nav ecosystem-product-rails__nav--previous"
            type="button"
            aria-label={`Ver productos anteriores de ${groupTitle}`}
            disabled={!canScrollPrevious}
            onClick={() => scrollTrack('previous')}
          >
            ‹
          </button>
          <button
            className="ecosystem-product-rails__nav ecosystem-product-rails__nav--next"
            type="button"
            aria-label={`Ver más productos de ${groupTitle}`}
            disabled={!canScrollNext}
            onClick={() => scrollTrack('next')}
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  )
}
