import type { ProductRailProduct } from '../productRails'
import { ProductCard } from '../../components/ProductCard'

type ProductCarouselItemCardProps = {
  product: ProductRailProduct
}

export function ProductCarouselItemCard({ product }: ProductCarouselItemCardProps) {
  return (
    <article className="ecosystem-product-rails__item-card">
      <ProductCard
        layout="rail"
        product={{
          id: product.id,
          name: product.name,
          href: product.href,
          imageUrl: product.imageUrl,
          imageAlt: product.imageAlt,
          priceAmount: product.priceAmount,
          currency: product.currency,
          storeName: product.storeName
        }}
      />
    </article>
  )
}
