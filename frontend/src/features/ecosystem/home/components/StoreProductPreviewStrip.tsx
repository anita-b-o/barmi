import { Link } from 'react-router-dom'
import type { StoreRailProductPreview } from '../storeRails'

type StoreProductPreviewStripProps = {
  storeName: string
  products: StoreRailProductPreview[]
}

export function StoreProductPreviewStrip({ storeName, products }: StoreProductPreviewStripProps) {
  return (
    <div className="ecosystem-store-rails__product-strip" aria-label={`Productos destacados de ${storeName}`}>
      {products.slice(0, 3).map((product, index) => (
        <Link
          key={product.id}
          className="ecosystem-store-rails__product-link"
          to={product.href}
          aria-label={`Ver ${storeName} desde producto destacado ${index + 1}`}
        >
          {product.imageUrl ? (
            <img className="ecosystem-store-rails__product-image" src={product.imageUrl} alt={product.alt} />
          ) : (
            <span className="ecosystem-store-rails__product-fallback" aria-hidden="true" />
          )}
        </Link>
      ))}
    </div>
  )
}
