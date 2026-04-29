import type { ProductRailProduct } from '../productRails'
import { ProductCardBody } from './ProductCardBody'
import { ProductCardImage } from './ProductCardImage'

type ProductCarouselItemCardProps = {
  product: ProductRailProduct
}

export function ProductCarouselItemCard({ product }: ProductCarouselItemCardProps) {
  return (
    <article className="ecosystem-product-rails__item-card">
      <ProductCardImage
        href={product.href}
        name={product.name}
        imageUrl={product.imageUrl}
        imageAlt={product.imageAlt}
      />
      <ProductCardBody product={product} />
    </article>
  )
}
