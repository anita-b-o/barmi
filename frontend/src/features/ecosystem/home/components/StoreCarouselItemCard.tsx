import type { StoreRailStore } from '../storeRails'
import { StoreCard } from '../../components/StoreCard'

type StoreCarouselItemCardProps = {
  store: StoreRailStore
}

export function StoreCarouselItemCard({ store }: StoreCarouselItemCardProps) {
  return (
    <article className="ecosystem-store-rails__item-card">
      <StoreCard
        layout="rail"
        store={{
          id: store.id,
          name: store.name,
          storeHref: store.storeHref,
          storeProductsHref: store.storeProductsHref,
          logoUrl: store.logoUrl,
          categoryLabel: store.categoryLabel,
          featuredProducts: store.featuredProducts
        }}
      />
    </article>
  )
}
