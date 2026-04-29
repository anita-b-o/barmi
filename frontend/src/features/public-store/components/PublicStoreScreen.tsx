import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { publicAdapter } from '../../../api/adapters/publicAdapter'
import type { PublicProduct, PublicStore, PublicStoreCatalogSort, PublicStorePromotion } from '../../../api/contracts/v1/public'
import { useCart } from '../../store/cart/cartContext'
import { routes } from '@/core/constants/routes'
import { formatMoneyFromCents } from '@/core/utils/format'
import { QuantitySelector } from '@/components/commerce'
import PublicStoreLayout from '@/layouts/PublicStoreLayout'
import { Breadcrumbs } from '@/components/navigation'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import TextInput from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemSurfaceSection } from '@/features/ecosystem'

const SORT_OPTIONS: Array<{ value: PublicStoreCatalogSort; label: string }> = [
  { value: 'default', label: 'Orden actual' },
  { value: 'name,asc', label: 'Nombre A-Z' },
  { value: 'name,desc', label: 'Nombre Z-A' },
  { value: 'price,asc', label: 'Precio menor' },
  { value: 'price,desc', label: 'Precio mayor' }
]

function formatPromotionExpiry(promotion: PublicStorePromotion) {
  if (!promotion.expirationDate) return null
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(promotion.expirationDate))
}

export default function PublicStoreScreen() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const [store, setStore] = useState<PublicStore | null>(null)
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sort, setSort] = useState<PublicStoreCatalogSort>('default')
  const [categoryId, setCategoryId] = useState('')

  const loadStore = useCallback(() => {
    let active = true
    const storeSlug = slug ?? ''
    setLoading(true)
    setError(null)
    Promise.all([
      publicAdapter.getStore(storeSlug),
      publicAdapter.getProducts(storeSlug, {
        q: searchQuery,
        availableOnly,
        sort,
        categoryId: categoryId || undefined
      })
    ])
      .then(([storeData, productsData]) => {
        if (!active) return
        setStore(storeData)
        setProducts(productsData)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Error cargando store')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug, searchQuery, availableOnly, sort, categoryId])

  useEffect(() => {
    return loadStore()
  }, [loadStore, reloadKey])

  const subtotalCents = useMemo(() => cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0), [cart.items])
  const cartItemsCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.qty, 0), [cart.items])
  const cartQtyByProductId = useMemo(() => Object.fromEntries(cart.items.map((item) => [item.productId, item.qty])), [cart.items])
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const isCurrentStoreCart = cart.storeSlug === slug || cart.storeSlug === null

  if (!slug) return <PublicStoreLayout><ErrorAlert message="Slug requerido." /></PublicStoreLayout>

  return (
    <PublicStoreLayout>
      <Breadcrumbs items={[{ label: 'Store', href: routes.publicStore(slug) }, { label: 'Catálogo' }]} />

      <div style={{ display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}>
        <EcosystemHeroSection
          eyebrow="Store storefront"
          title="Catálogo de la tienda"
          description="Ahora estás dentro de una tienda específica. Los productos que agregues acá se guardan en el carrito propio de esta store y no se mezclan con el carrito externo del ecosystem."
          badges={(
            <>
              <EcosystemHeroBadge>{store?.name ?? 'Store'}</EcosystemHeroBadge>
              <EcosystemHeroBadge variant="info">Productos propios</EcosystemHeroBadge>
              <EcosystemHeroBadge variant="success">{products.length} productos visibles</EcosystemHeroBadge>
              <EcosystemHeroBadge>Carrito: {cartItemsCount} item{cartItemsCount === 1 ? '' : 's'}</EcosystemHeroBadge>
              {store?.categories.length ? <EcosystemHeroBadge>{store.categories.length} categorías públicas</EcosystemHeroBadge> : null}
            </>
          )}
          actions={!isMobile ? (
            <>
              <Button variant="primary" onClick={() => navigate(routes.storeCheckout)} disabled={cart.items.length === 0}>
                Ir al carrito de la tienda{cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}
              </Button>
              <Button variant="secondary" onClick={() => navigate(routes.ecosystemHome)}>
                Volver al ecosystem
              </Button>
            </>
          ) : undefined}
          aside={(
            <>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: theme.typography.small.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textMuted, textTransform: 'uppercase' }}>
                  Flujo público Barmi
                </div>
                <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary }}>
                  Carrito de {store?.name ?? 'esta tienda'}
                </div>
                <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                  Catálogo rápido, contexto claro de tienda y compra dentro de su carrito propio. El ecosystem queda separado para discovery y productos externos.
                </div>
              </div>
              <Button variant="primary" onClick={() => navigate(routes.storeCheckout)} disabled={cart.items.length === 0}>
                Ir al carrito de la tienda{cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}
              </Button>
              <Button variant="secondary" onClick={() => navigate(routes.ecosystemHome)}>
                Volver al ecosystem
              </Button>
              <Button variant="ghost" onClick={() => navigate(routes.ecosystemStoresMap)}>
                Ver mapa de tiendas
              </Button>
            </>
          )}
          style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xxl }}
        />

        <EcosystemSurfaceSection tone="warm" style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xl }}>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.sm }}>
            <Badge variant="neutral">Storefront público</Badge>
            <Badge variant="neutral">Carrito separado del ecosystem</Badge>
            {cart.storeSlug && cart.storeSlug !== slug ? <Badge variant="warning">Tu carrito pertenece a otra tienda</Badge> : null}
          </div>
          <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
            Este flujo de compra pertenece a la tienda actual. Si venís desde Explore o desde el mapa del ecosystem, el discovery queda atrás y la compra continúa con el carrito independiente de esta store.
          </div>
        </EcosystemSurfaceSection>

        {loading ? (
          <EcosystemSurfaceSection>
            <LoadingBlock label="Cargando store..." />
          </EcosystemSurfaceSection>
        ) : null}

        {error ? (
          <EcosystemSurfaceSection>
            <ErrorAlert
              message={error}
              actionLabel="Reintentar"
              onAction={() => setReloadKey((current) => current + 1)}
              actionDisabled={loading}
            />
          </EcosystemSurfaceSection>
        ) : null}

        {!loading && !error && store && store.promotions.length > 0 ? (
          <EcosystemSurfaceSection tone="warm">
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary }}>
                  Promociones activas para esta store
                </div>
                <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                  Ingresá el código manualmente en checkout para ver el descuento aplicado sobre tu total dentro de esta tienda.
                </div>
              </div>
              <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
                {store.promotions.map((promotion) => (
                  <div
                    key={promotion.code}
                    style={{
                      display: 'grid',
                      gap: theme.spacing.md,
                      padding: theme.spacing.lg,
                      borderRadius: theme.radius.lg,
                      background: theme.colors.bgSurfaceAlt,
                      border: `1px solid ${theme.colors.borderDefault}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <Badge variant="info">Promo store</Badge>
                      {formatPromotionExpiry(promotion) ? <Badge variant="neutral">Vence {formatPromotionExpiry(promotion)}</Badge> : null}
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{promotion.shortLabel}</div>
                      <div style={{ color: theme.colors.textMuted, overflowWrap: 'anywhere' }}>
                        Código: <strong>{promotion.code}</strong>
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => navigate(routes.storeCheckout)}>
                      Usar en checkout
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </EcosystemSurfaceSection>
        ) : null}

        {!loading && !error ? (
          <EcosystemSurfaceSection>
            <div style={{ display: 'grid', gap: theme.spacing.xl }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: theme.spacing.lg,
                  alignItems: 'flex-end',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary }}>
                    Productos
                  </div>
                  <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                    Explorar catálogo con foco en productos propios de esta tienda y compra directa desde su carrito independiente.
                  </div>
                </div>
                <div style={{ color: theme.colors.textMuted }}>
                  Subtotal actual: <strong style={{ color: theme.colors.textPrimary }}>{formatMoneyFromCents(subtotalCents)}</strong>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: theme.spacing.lg,
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.lg,
                  background: theme.colors.bgSurfaceAlt,
                  border: `1px solid ${theme.colors.borderDefault}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: theme.colors.textPrimary }}>Explorar catálogo</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>
                      {products.length} resultado{products.length === 1 ? '' : 's'} visibles con la configuración actual.
                    </div>
                  </div>
                  <Badge variant="neutral">{availableOnly ? 'Solo disponibles' : 'Todo el catálogo visible'}</Badge>
                </div>

                <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'end' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>Buscar</div>
                    <TextInput
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Buscar por nombre o SKU"
                      aria-label="Buscar productos"
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>Ordenar</div>
                    <SelectField
                      value={sort}
                      onChange={(event) => setSort(event.target.value as PublicStoreCatalogSort)}
                      options={SORT_OPTIONS}
                      aria-label="Ordenar productos"
                    />
                  </div>
                </div>

                {store && store.categories.length > 0 ? (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>Categoría</div>
                    <SelectField
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      options={[
                        { value: '', label: 'Todas las categorías' },
                        ...store.categories.map((category) => ({ value: category.id, label: category.name }))
                      ]}
                      aria-label="Filtrar por categoría"
                    />
                  </div>
                ) : null}

                <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, color: theme.colors.textMuted }}>
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) => setAvailableOnly(event.target.checked)}
                    aria-label="Solo disponibles"
                  />
                  Solo disponibles
                </label>
              </div>

              {products.length === 0 ? (
                <EmptyState
                  title={searchQuery.trim() || availableOnly || sort !== 'default' || categoryId
                    ? 'No hay productos para esos filtros'
                    : 'No hay productos disponibles'}
                  description={searchQuery.trim() || availableOnly || sort !== 'default' || categoryId
                    ? 'Probá cambiar la búsqueda, mostrar productos sin stock o volver al orden actual.'
                    : undefined}
                />
              ) : (
                <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
                  {products.map((product) => {
                    const cartQty = cartQtyByProductId[product.id] ?? 0

                    return (
                    <Card
                      key={product.id}
                      variant={product.isAvailable ? 'surface' : 'soft'}
                      style={{
                        padding: 0,
                        overflow: 'hidden',
                        borderColor: cartQty > 0 ? theme.colors.borderAccentSoft : undefined
                      }}
                    >
                      <div
                        style={{
                          padding: theme.spacing.lg,
                          borderBottom: `1px solid ${theme.colors.borderDefault}`,
                          background: theme.colors.bgSurfaceAlt
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            minHeight: 118,
                            borderRadius: theme.radius.md,
                            border: `1px solid ${theme.colors.borderAccentSoft}`,
                            background: theme.colors.bgSurfaceAlt,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.colors.brand,
                            fontWeight: 700,
                            letterSpacing: 0,
                            textTransform: 'uppercase'
                          }}
                        >
                          Producto store
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: theme.spacing.lg, padding: theme.spacing.xl }}>
                        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                          {product.categoryName ? <Badge variant="info">{product.categoryName}</Badge> : null}
                          <Badge variant={product.isAvailable ? 'success' : 'error'}>
                            {product.isAvailable ? `Disponible ahora · Stock disponible: ${product.stockQuantity}` : 'Sin stock disponible'}
                          </Badge>
                          {cartQty > 0 ? <Badge variant="success">En carrito: {cartQty}</Badge> : null}
                        </div>

                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0, overflowWrap: 'anywhere' }}>{product.name}</div>
                          <div style={{ color: theme.colors.textMuted, overflowWrap: 'anywhere' }}>SKU: {product.sku}</div>
                          <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                            {product.isAvailable
                              ? 'Este producto se compra directamente en esta tienda y se agrega a su carrito propio.'
                              : 'Se mantiene visible para referencia, pero no se puede agregar al carrito.'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <div style={{ display: 'grid', gap: 4 }}>
                            <div style={{ fontSize: theme.typography.small.size, color: theme.colors.textMuted, fontWeight: 600 }}>
                              Precio
                            </div>
                            <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, color: theme.colors.textPrimary }}>
                              {formatMoneyFromCents(product.priceCents)}
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            disabled={!product.isAvailable}
                            onClick={() => cart.addItem(slug, { productId: product.id, name: product.name, priceCents: product.priceCents })}
                          >
                            {product.isAvailable ? 'Agregar' : 'Sin stock'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </EcosystemSurfaceSection>
        ) : null}

        <EcosystemSurfaceSection
          tone="warm"
          style={{
            background: theme.colors.bgSurfaceAlt
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: theme.spacing.xl,
              alignItems: 'flex-start',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'grid', gap: 6, maxWidth: 760 }}>
              <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary }}>
                Carrito de {store?.name ?? 'la tienda'}
              </div>
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                Este carrito es independiente del carrito de productos externos del ecosystem. Podés seguir comprando en la tienda o pasar al checkout de store cuando quieras.
              </div>
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge variant="neutral">{isCurrentStoreCart ? 'Carrito alineado con esta tienda' : 'Cambiarías de carrito al agregar productos aquí'}</Badge>
            </div>
          </div>

          <div style={{ display: 'grid', gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
            {cart.items.length === 0 ? (
              <EmptyState
                title="Carrito vacío"
                description="Todavía no agregaste productos de esta tienda. Podés seguir explorando el catálogo o volver al ecosystem."
                actionLabel="Seguir comprando en la tienda"
                onAction={() => navigate(routes.publicStore(slug))}
              />
            ) : (
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: theme.spacing.lg,
                      flexWrap: 'wrap',
                      padding: theme.spacing.lg,
                      borderRadius: theme.radius.lg,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      background: theme.colors.bgSurfaceAlt
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                      <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{item.name}</div>
                      <div style={{ color: theme.colors.textMuted, overflowWrap: 'anywhere' }}>
                        {item.qty} x {formatMoneyFromCents(item.priceCents)}
                      </div>
                      {(() => {
                        const product = productById.get(item.productId)
                        if (!product) return null
                        if (!product.isAvailable) {
                          return <div style={{ color: theme.colors.error, marginTop: 4 }}>Este producto quedó sin stock.</div>
                        }
                        if (item.qty >= product.stockQuantity) {
                          return <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>Máximo disponible en catálogo: {product.stockQuantity}</div>
                        }
                        return null
                      })()}
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <QuantitySelector
                        value={item.qty}
                        onDecrease={() => cart.removeItem(item.productId)}
                        onIncrease={() => cart.addItem(slug, { productId: item.productId, name: item.name, priceCents: item.priceCents })}
                        disableIncrease={!productById.get(item.productId)?.isAvailable || item.qty >= (productById.get(item.productId)?.stockQuantity ?? 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ color: theme.colors.textMuted }}>Subtotal</div>
                <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, color: theme.colors.textPrimary }}>
                  {formatMoneyFromCents(subtotalCents)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => navigate(routes.publicStore(slug))}>
                  Seguir comprando en tienda
                </Button>
                <Button variant="primary" disabled={cart.items.length === 0} onClick={() => navigate(routes.storeCheckout)}>
                  Ir al checkout de la tienda
                </Button>
              </div>
            </div>
          </div>
        </EcosystemSurfaceSection>
      </div>
    </PublicStoreLayout>
  )
}
