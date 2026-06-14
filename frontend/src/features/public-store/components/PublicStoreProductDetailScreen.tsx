import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PublicStoreLayout from '@/layouts/PublicStoreLayout'
import { routes } from '@/core/constants/routes'
import { formatMoneyFromCents } from '@/core/utils/format'
import { buildCanonicalUrl, useJsonLd, useSeoMetadata } from '@/core/seo'
import { useCart } from '@/features/store/cart/cartContext'
import { usePublicStoreProductDetail } from '../hooks/usePublicStoreProductDetail'
import { theme } from '@/app/theme'
import { Breadcrumbs } from '@/components/navigation'
import { EcosystemSurfaceSection } from '@/features/ecosystem'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import Card from '@/components/primitives/Card'
import EmptyState from '@/components/feedback/EmptyState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { trackBetaEvent } from '@/features/beta'

const detailStyles = {
  pageStack: { display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  detailGrid: { display: 'grid', gap: theme.spacing.xl, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', alignItems: 'start' },
  mediaCard: { padding: theme.spacing.lg },
  image: {
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  placeholder: {
    minHeight: 260,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt,
    display: 'grid',
    placeItems: 'center',
    color: theme.colors.textMuted,
    fontWeight: 700,
    letterSpacing: 0,
    textAlign: 'center',
    padding: theme.spacing.lg
  },
  contentStack: { display: 'grid', gap: theme.spacing.lg },
  compactStack: { display: 'grid', gap: 6 },
  badgeRow: { display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary, overflowWrap: 'anywhere' },
  muted: { color: theme.colors.textMuted, lineHeight: 1.6, overflowWrap: 'anywhere' },
  price: { fontSize: theme.typography.h2.size, fontWeight: 800, letterSpacing: 0, color: theme.colors.textPrimary },
  actionRow: { display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'center' },
  metaGrid: { display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' },
  metaItem: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  metaLabel: { color: theme.colors.textMuted, fontSize: theme.typography.small.size, fontWeight: 600, marginBottom: 4 },
  metaValue: { color: theme.colors.textPrimary, fontWeight: 700, overflowWrap: 'anywhere' }
} satisfies Record<string, CSSProperties>

export default function PublicStoreProductDetailScreen() {
  const { storeSlug, productSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const cart = useCart()
  const trackedDetailViewRef = useRef('')
  const trackedNotFoundRef = useRef('')
  const {
    detail,
    cartProduct,
    isLoading,
    isCartLookupLoading,
    isNotFound,
    isError
  } = usePublicStoreProductDetail({ storeSlug, productSlug })

  const product = detail?.product ?? null
  const store = detail?.store ?? null
  const canonicalPath = storeSlug && productSlug
    ? routes.publicStoreProduct(storeSlug, productSlug)
    : '/public'
  const robots = detail && !isNotFound && !isError ? 'index,follow' : 'noindex,follow'

  useSeoMetadata({
    title: product && store ? `${product.name} en ${store.name} | Barmi` : 'Producto no encontrado | Barmi',
    description: product && store
      ? `Compra ${product.name} en ${store.name}. Precio y disponibilidad actualizados.`
      : 'Producto no encontrado',
    path: canonicalPath,
    robots
  })
  const canonicalUrl = buildCanonicalUrl(canonicalPath)
  const storeCanonicalUrl = storeSlug ? buildCanonicalUrl(routes.publicStore(storeSlug)) : null
  const hasQueryParams = location.search.length > 0
  const hasProductJsonLdMinimumData = Boolean(
    product &&
    store &&
    product.name &&
    Number.isFinite(product.priceCents) &&
    product.currency &&
    canonicalUrl
  )
  const productJsonLd = product && store && storeCanonicalUrl && robots === 'index,follow' && !hasQueryParams && hasProductJsonLdMinimumData
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description ?? `Producto publicado por ${store.name} en Barmi.`,
        ...(product.imageUrl ? { image: product.imageUrl } : {}),
        offers: {
          '@type': 'Offer',
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: product.currency,
          availability: product.isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: canonicalUrl,
          seller: {
            '@type': 'Store',
            name: store.name,
            url: storeCanonicalUrl
          }
        }
      }
    : null
  useJsonLd({
    id: storeSlug && productSlug ? `public-store-product-${storeSlug}-${productSlug}` : 'public-store-product',
    path: canonicalPath,
    robots,
    data: productJsonLd
  })

  useEffect(() => {
    if (!storeSlug || !productSlug || !product || !store || isNotFound || isError) return
    const signature = `${storeSlug}|${product.slug}`
    if (trackedDetailViewRef.current === signature) return
    trackedDetailViewRef.current = signature

    trackBetaEvent({
      eventName: 'public_product_detail_viewed',
      storeSlug,
      productSlug: product.slug,
      metadata: {
        isAvailable: product.isAvailable ? 'true' : 'false',
        hasDescription: product.description ? 'true' : 'false',
        hasImage: product.imageUrl ? 'true' : 'false',
        categoryName: product.categoryName ? 'present' : 'not_present'
      }
    })
  }, [isError, isNotFound, product, productSlug, store, storeSlug])

  useEffect(() => {
    if (!storeSlug || !productSlug || !isNotFound) return
    const signature = `${storeSlug}|${productSlug}`
    if (trackedNotFoundRef.current === signature) return
    trackedNotFoundRef.current = signature

    trackBetaEvent({
      eventName: 'public_product_detail_not_found',
      storeSlug,
      productSlug
    })
  }, [isNotFound, productSlug, storeSlug])

  const cartQty = useMemo(() => (
    cartProduct ? cart.items.find((item) => item.productId === cartProduct.id)?.qty ?? 0 : 0
  ), [cart.items, cartProduct])

  if (!storeSlug || !productSlug) {
    return (
      <PublicStoreLayout>
        <EcosystemSurfaceSection>
          <EmptyState title="Producto no encontrado" />
        </EcosystemSurfaceSection>
      </PublicStoreLayout>
    )
  }

  if (isLoading) {
    return (
      <PublicStoreLayout>
        <EcosystemSurfaceSection>
          <LoadingBlock label="Cargando producto..." />
        </EcosystemSurfaceSection>
      </PublicStoreLayout>
    )
  }

  if (!detail || isNotFound || isError) {
    return (
      <PublicStoreLayout>
        <EcosystemSurfaceSection>
          <EmptyState
            title="Producto no encontrado"
            actionLabel="Volver a la tienda"
            onAction={() => navigate(routes.publicStore(storeSlug))}
          />
        </EcosystemSurfaceSection>
      </PublicStoreLayout>
    )
  }

  const loadedProduct = detail.product
  const loadedStore = detail.store
  const canAddToCart = loadedProduct.isAvailable && cartProduct && !isCartLookupLoading

  return (
    <PublicStoreLayout>
      <Breadcrumbs items={[
        { label: 'Store', href: routes.publicStore(storeSlug) },
        { label: loadedProduct.name }
      ]} />

      <div style={detailStyles.pageStack}>
        <EcosystemSurfaceSection>
          <div style={detailStyles.detailGrid}>
            <Card variant="soft" style={detailStyles.mediaCard}>
              {loadedProduct.imageUrl ? (
                <img src={loadedProduct.imageUrl} alt={loadedProduct.name} style={detailStyles.image} />
              ) : (
                <div style={detailStyles.placeholder}>Imagen no disponible</div>
              )}
            </Card>

            <div style={detailStyles.contentStack}>
              <div style={detailStyles.badgeRow}>
                {loadedProduct.categoryName ? <Badge variant="info">{loadedProduct.categoryName}</Badge> : null}
                <Badge variant={loadedProduct.isAvailable ? 'success' : 'error'}>
                  {loadedProduct.isAvailable ? `Disponible ahora · Stock disponible: ${loadedProduct.stockQuantity}` : 'Sin stock disponible'}
                </Badge>
                {cartQty > 0 ? <Badge variant="success">En carrito: {cartQty}</Badge> : null}
              </div>

              <div style={detailStyles.compactStack}>
                <div style={detailStyles.title}>{loadedProduct.name}</div>
                <div style={detailStyles.muted}>{loadedStore.name}</div>
              </div>

              <div style={detailStyles.price}>{formatMoneyFromCents(loadedProduct.priceCents)}</div>

              {loadedProduct.description ? (
                <div style={detailStyles.muted}>{loadedProduct.description}</div>
              ) : null}

              <div style={detailStyles.metaGrid}>
                <div style={detailStyles.metaItem}>
                  <div style={detailStyles.metaLabel}>Disponibilidad</div>
                  <div style={detailStyles.metaValue}>{loadedProduct.isAvailable ? 'Disponible' : 'Sin stock'}</div>
                </div>
                {loadedProduct.categoryName ? (
                  <div style={detailStyles.metaItem}>
                    <div style={detailStyles.metaLabel}>Categoría</div>
                    <div style={detailStyles.metaValue}>{loadedProduct.categoryName}</div>
                  </div>
                ) : null}
                {loadedProduct.sku ? (
                  <div style={detailStyles.metaItem}>
                    <div style={detailStyles.metaLabel}>SKU</div>
                    <div style={detailStyles.metaValue}>{loadedProduct.sku}</div>
                  </div>
                ) : null}
              </div>

              <div style={detailStyles.actionRow}>
                <Button
                  variant="primary"
                  disabled={!canAddToCart}
                  onClick={() => {
                    if (!cartProduct) return
                    trackBetaEvent({
                      eventName: 'public_product_detail_add_to_cart',
                      storeSlug,
                      productSlug: loadedProduct.slug,
                      metadata: {
                        isAvailable: loadedProduct.isAvailable ? 'true' : 'false',
                        quantity: '1'
                      }
                    })
                    cart.addItem(storeSlug, {
                      productId: cartProduct.id,
                      name: loadedProduct.name,
                      priceCents: loadedProduct.priceCents
                    })
                  }}
                >
                  {loadedProduct.isAvailable ? 'Agregar al carrito' : 'Sin stock'}
                </Button>
                <Button variant="secondary" onClick={() => navigate(routes.publicStore(storeSlug))}>
                  Volver a la tienda
                </Button>
              </div>
            </div>
          </div>
        </EcosystemSurfaceSection>
      </div>
    </PublicStoreLayout>
  )
}
