import type { StoreRailStore } from '../storeRails'
import { useCarouselTrack } from './useCarouselTrack'
import { StoreCarouselItemCard } from './StoreCarouselItemCard'

type StoreCarouselTrackProps = {
  groupTitle: string
  stores: StoreRailStore[]
}

export function StoreCarouselTrack({ groupTitle, stores }: StoreCarouselTrackProps) {
  const {
    canNavigate,
    canScrollNext,
    canScrollPrevious,
    scrollTrack,
    trackRef
  } = useCarouselTrack({
    itemCount: stores.length,
    itemSelector: '.ecosystem-store-rails__item-card'
  })

  return (
    <div className="ecosystem-store-rails__carousel-body">
      <div
        ref={trackRef}
        className={`ecosystem-store-rails__track${stores.length <= 4 ? ' ecosystem-store-rails__track--compact' : ''}`}
        aria-label={`Carousel de ${groupTitle}`}
        tabIndex={0}
      >
        {stores.map((store) => (
          <StoreCarouselItemCard key={store.id} store={store} />
        ))}
      </div>

      {canNavigate ? (
        <>
          <button
            className="ecosystem-store-rails__nav ecosystem-store-rails__nav--previous"
            type="button"
            aria-label={`Ver tiendas anteriores de ${groupTitle}`}
            disabled={!canScrollPrevious}
            onClick={() => scrollTrack('previous')}
          >
            ‹
          </button>
          <button
            className="ecosystem-store-rails__nav ecosystem-store-rails__nav--next"
            type="button"
            aria-label={`Ver más tiendas de ${groupTitle}`}
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
