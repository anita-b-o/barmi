import type { PublicEcosystem, PublicEcosystemProduct } from '../../../../api/contracts/v1/public'
import { ProductCard } from '../../components/ProductCard'

type EcosystemCatalogGridProps = {
  ecosystem: PublicEcosystem
  products: PublicEcosystemProduct[]
  cartQtyByProductId: Record<string, number>
  onAddProduct: (product: PublicEcosystemProduct) => void
}

export function EcosystemCatalogGrid({ ecosystem, products, cartQtyByProductId, onAddProduct }: EcosystemCatalogGridProps) {
  return (
    <div className="ecosystem-catalog-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          layout="grid"
          ecosystemName={ecosystem.name}
          cartQty={cartQtyByProductId[product.id] ?? 0}
          product={{
            id: product.id,
            name: product.name,
            href: `/ecosystem/catalog?q=${encodeURIComponent(product.name)}`,
            priceAmount: product.priceAmount,
            currency: product.currency,
            deliverySupported: product.deliverySupported,
            storeName: ecosystem.name
          }}
          onAdd={() => onAddProduct(product)}
        />
      ))}
    </div>
  )
}
