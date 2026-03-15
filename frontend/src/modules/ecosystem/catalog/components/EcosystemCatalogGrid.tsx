import { Badge, Button, Card } from '../../../../design-system/components'
import { ProductGrid } from '../../../../design-system/patterns'
import { formatMoney } from '../../../../ui/utils/format'
import { theme } from '../../../../app/theme'
import type { PublicEcosystem, PublicEcosystemProduct } from '../../../../api/contracts/v1/public'

type EcosystemCatalogGridProps = {
  ecosystem: PublicEcosystem
  products: PublicEcosystemProduct[]
  cartQtyByProductId: Record<string, number>
  onAddProduct: (product: PublicEcosystemProduct) => void
}

export function EcosystemCatalogGrid({ ecosystem, products, cartQtyByProductId, onAddProduct }: EcosystemCatalogGridProps) {
  return (
    <ProductGrid>
      {products.map((product) => (
        <Card key={product.id}>
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge>{ecosystem.name}</Badge>
              <Badge variant={product.deliverySupported ? 'success' : 'neutral'}>
                {product.deliverySupported ? 'Entrega disponible' : 'Sin entrega'}
              </Badge>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{product.name}</div>
              <div style={{ color: theme.colors.textMuted, marginTop: 6 }}>{product.id}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{formatMoney(product.priceAmount, product.currency)}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {cartQtyByProductId[product.id] ? <Badge variant="neutral">En carrito: {cartQtyByProductId[product.id]}</Badge> : null}
                <Button onClick={() => onAddProduct(product)}>Agregar</Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </ProductGrid>
  )
}
