import { Link } from 'react-router-dom'
import type { StoreRailStore } from '../storeRails'
import { StoreLogoCard } from './StoreLogoCard'
import { StoreMoreProductsButton } from './StoreMoreProductsButton'
import { StoreProductPreviewStrip } from './StoreProductPreviewStrip'

type StoreCarouselItemCardProps = {
  store: StoreRailStore
}

export function StoreCarouselItemCard({ store }: StoreCarouselItemCardProps) {
  return (
    <article className="ecosystem-store-rails__item-card">
      <StoreLogoCard name={store.name} href={store.storeHref} logoUrl={store.logoUrl} />
      <div className="ecosystem-store-rails__products-wrap">
        <StoreProductPreviewStrip storeName={store.name} products={store.featuredProducts} />
        <StoreMoreProductsButton storeName={store.name} href={store.storeProductsHref} />
      </div>
      <Link className="ecosystem-store-rails__store-name" to={store.storeHref}>
        {store.name}
      </Link>
    </article>
  )
}
