import type { StoreRailGroup } from '../storeRails'
import { SectionRail } from '../../components/SectionRail'
import { EmptyCarouselState } from './EmptyCarouselState'
import { StoreCarouselTrack } from './StoreCarouselTrack'

type StoreGroupCarouselProps = {
  group: StoreRailGroup
}

export function StoreGroupCarousel({ group }: StoreGroupCarouselProps) {
  const titleId = `store-rail-${group.id}`

  return (
    <section aria-labelledby={titleId} id={group.id === 'featured' ? 'home-section-stores-featured' : undefined}>
      <SectionRail title={group.title} titleId={titleId} actionHref={group.viewMoreHref}>
      {group.stores.length > 0 ? (
        <StoreCarouselTrack groupTitle={group.title} stores={group.stores} />
      ) : (
        <EmptyCarouselState ctaHref={group.viewMoreHref} ctaLabel="Ver tiendas" />
      )}
      </SectionRail>
    </section>
  )
}
