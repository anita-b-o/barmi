import { memo } from 'react'
import { Link } from 'react-router-dom'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import { formatMoney } from '@/core/utils/format'
import { SurfaceCard } from './SurfaceCard'
import { appConfig } from '@/app/config/env'
import { trackBetaEvent } from '@/features/beta'

type ProductCardProduct = {
  id: string
  name: string
  href: string
  imageUrl?: string | null
  imageAlt?: string
  priceAmount: number | null
  currency: string | null
  deliverySupported?: boolean
  storeName?: string | null
}

type ProductCardProps = {
  product: ProductCardProduct
  layout?: 'rail' | 'grid'
  ecosystemName?: string
  cartQty?: number
  onAdd?: () => void
}

function ProductImageFallback() {
  return (
    <div className="ecosystem-product-card__image-fallback" aria-hidden="true">
      <span className="ecosystem-product-card__image-tile" />
      <span className="ecosystem-product-card__image-tile" />
      <span className="ecosystem-product-card__image-tile" />
      <span className="ecosystem-product-card__image-tile" />
      <span className="ecosystem-product-card__image-tile" />
      <span className="ecosystem-product-card__image-tile" />
    </div>
  )
}

function ProductCardBase({
  product,
  layout = 'grid',
  ecosystemName,
  cartQty = 0,
  onAdd
}: ProductCardProps) {
  const isRail = layout === 'rail'
  const isInCart = cartQty > 0
  const priceLabel = product.priceAmount !== null && product.currency
    ? formatMoney(product.priceAmount, product.currency)
    : 'Consultar'
  const trackClick = () => {
    trackBetaEvent({
      eventName: 'product_click',
      ecosystemSlug: appConfig.publicEcosystemSlug,
      productId: product.id,
      storeName: product.storeName ?? undefined,
      metadata: {
        surface: layout,
        ecosystem: ecosystemName ?? 'barmi'
      }
    })
  }

  return (
    <SurfaceCard
      variant="interactive"
      selected={isInCart}
      className={`ecosystem-product-card ecosystem-product-card--${layout}`}
      style={{ padding: 0 }}
    >
      <Link className="ecosystem-product-card__link" to={product.href} onClick={trackClick}>
        <div className="ecosystem-product-card__media">
          {product.imageUrl ? (
            <img
              className="ecosystem-product-card__image"
              src={product.imageUrl}
              alt={product.imageAlt ?? product.name}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <ProductImageFallback />
          )}
        </div>
      </Link>

      <div className="ecosystem-product-card__body">
        <div className="ecosystem-product-card__meta">
          {product.deliverySupported !== undefined ? (
            <Badge variant={product.deliverySupported ? 'success' : 'neutral'}>
              {product.deliverySupported ? 'Entrega disponible' : 'Sin entrega'}
            </Badge>
          ) : null}
          {ecosystemName ? <Badge variant="info">{ecosystemName}</Badge> : null}
          {isInCart ? <Badge variant="warning">En carrito: {cartQty}</Badge> : null}
        </div>

        <div className="ecosystem-stack" style={{ gap: 8 }}>
          <Link className="ecosystem-product-card__link" to={product.href} onClick={trackClick}>
            <h3 className="ecosystem-product-card__title">{product.name}</h3>
          </Link>
          <p className="ecosystem-product-card__store">{product.storeName ?? ecosystemName ?? 'Marketplace Barmi'}</p>
        </div>

        <div className="ecosystem-product-card__price-row">
          <div className="ecosystem-product-card__price-block">
            <div className="ecosystem-product-card__price">{priceLabel}</div>
            <div className="ecosystem-product-card__caption">
              {isRail ? 'Descubrilo en el marketplace' : 'Se valida en el backend al agregar'}
            </div>
          </div>

          {onAdd ? (
            <Button
              className="ecosystem-product-card__cta"
              variant={isInCart ? 'secondary' : 'primary'}
              onClick={() => {
                trackClick()
                onAdd()
              }}
            >
              {isInCart ? 'Agregar otra' : 'Agregar'}
            </Button>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  )
}

export const ProductCard = memo(ProductCardBase)
