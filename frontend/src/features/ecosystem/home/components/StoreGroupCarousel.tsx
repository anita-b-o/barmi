import type { StoreRailGroup } from '../storeRails'
import { EmptyCarouselState } from './EmptyCarouselState'
import { StoreCarouselHeader } from './StoreCarouselHeader'
import { StoreCarouselTrack } from './StoreCarouselTrack'

type StoreGroupCarouselProps = {
  group: StoreRailGroup
}

export function StoreGroupCarousel({ group }: StoreGroupCarouselProps) {
  const titleId = `store-rail-${group.id}`

  return (
    <section className="ecosystem-store-rails__group" aria-labelledby={titleId}>
      <StoreCarouselHeader title={group.title} titleId={titleId} viewMoreHref={group.viewMoreHref} />
      {group.stores.length > 0 ? (
        <StoreCarouselTrack groupTitle={group.title} stores={group.stores} />
      ) : (
        <EmptyCarouselState ctaHref={group.viewMoreHref} ctaLabel="Ver tiendas" />
      )}
    </section>
  )
}
