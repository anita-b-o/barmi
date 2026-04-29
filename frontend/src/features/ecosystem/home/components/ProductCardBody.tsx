import { Link } from 'react-router-dom'
import { formatMoney } from '@/core/utils/format'
import type { ProductRailProduct } from '../productRails'

type ProductCardBodyProps = {
  product: ProductRailProduct
}

export function ProductCardBody({ product }: ProductCardBodyProps) {
  const priceLabel = product.priceAmount !== null && product.currency
    ? formatMoney(product.priceAmount, product.currency)
    : 'Precio a consultar'

  return (
    <div className="ecosystem-product-rails__body">
      <Link className="ecosystem-product-rails__name" to={product.href}>
        {product.name}
      </Link>
      <Link className="ecosystem-product-rails__price" to={product.href} aria-label={`Ver ${product.name}, ${priceLabel}`}>
        {priceLabel}
      </Link>
    </div>
  )
}
