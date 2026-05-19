import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { theme } from '@/app/theme'
import { appConfig } from '@/app/config/env'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import { routes } from '@/core/constants/routes'
import { EcosystemCatalogFilters, EcosystemCatalogGrid, useEcosystemCatalog } from '@/features/ecosystem'
import { SurfaceCard } from '@/features/ecosystem/components/SurfaceCard'
import '@/features/ecosystem/components/ecosystem-marketplace.css'
import { useEcosystemCart } from '@/features/ecosystem/cart/ecosystemCartContext'
import { EcosystemLayout } from '../../layouts'
import type { PublicEcosystemCatalogSort } from '../../api/contracts/v1/public'
import { trackBetaEvent } from '@/features/beta'

export default function EcosystemCatalogScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') ?? 'default') as PublicEcosystemCatalogSort
  const deliverySupportedOnly = searchParams.get('deliverySupported') === 'true'
  const catalog = useEcosystemCatalog(query, sort, deliverySupportedOnly)
  const cart = useEcosystemCart()
  const cartQtyByProductId = Object.fromEntries(cart.items.map((item) => [item.externalProductId, item.qty]))
  const productsCount = catalog.products.length
  const hasProducts = productsCount > 0
  const title = catalog.ecosystem?.name ?? 'Marketplace Barmi'
  const trackedSearchRef = useRef('')
  const quickActions = useMemo(() => ([
    {
      id: 'delivery',
      label: deliverySupportedOnly ? 'Mostrar todo' : 'Solo con entrega',
      onClick: () => updateParams({ deliverySupported: !deliverySupportedOnly })
    },
    {
      id: 'price',
      label: sort === 'price,asc' ? 'Orden actual' : 'Precio menor',
      onClick: () => updateParams({ sort: sort === 'price,asc' ? 'default' : 'price,asc' })
    },
    {
      id: 'clear',
      label: query.trim() ? 'Limpiar búsqueda' : 'Ver todo',
      onClick: () => updateParams({ q: '', sort: 'default', deliverySupported: false })
    }
  ]), [deliverySupportedOnly, query, sort, searchParams])

  useEffect(() => {
    trackBetaEvent({
      eventName: 'catalog_view',
      ecosystemSlug: appConfig.publicEcosystemSlug,
      metadata: { surface: 'ecosystem_catalog' }
    })
  }, [])

  useEffect(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized || trackedSearchRef.current === normalized) return
    trackedSearchRef.current = normalized
    trackBetaEvent({
      eventName: 'search_used',
      ecosystemSlug: appConfig.publicEcosystemSlug,
      searchTerm: normalized,
      metadata: { surface: 'ecosystem_catalog' }
    })
  }, [query])

  const updateParams = (updates: Record<string, string | boolean>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === false || value === 'default') next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
  }

  return (
    <EcosystemLayout>
      <main className="ecosystem-catalog-page">
        <SurfaceCard variant="inverse" className="ecosystem-catalog-page__hero">
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Badge variant="info">Catálogo</Badge>
            {hasProducts ? <Badge variant="success">{productsCount} productos</Badge> : null}
            {catalog.ecosystem?.promotions.length ? <Badge variant="success">Promociones disponibles</Badge> : null}
          </div>
          <h1>{title}</h1>
          <p style={{ margin: 0, color: 'var(--barmi-color-text-muted)', lineHeight: 1.6 }}>
            Explorá productos del marketplace. Si algo no aparece, probá una búsqueda más corta o pasá al mapa para abrir una tienda puntual.
          </p>
          {catalog.ecosystem?.promotions.length ? (
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              {catalog.ecosystem.promotions.map((promotion) => (
                <Badge key={promotion.code} variant="success">{promotion.shortLabel}</Badge>
              ))}
            </div>
          ) : null}
        </SurfaceCard>

        <div className="ecosystem-catalog-page__layout">
          <EcosystemCatalogFilters
            query={query}
            sort={sort}
            deliverySupportedOnly={deliverySupportedOnly}
            onQueryChange={(value) => updateParams({ q: value })}
            onSortChange={(value) => updateParams({ sort: value })}
            onDeliverySupportedOnlyChange={(value) => updateParams({ deliverySupported: value })}
          />

          <section className="ecosystem-stack">
            <SurfaceCard variant="panel" className="ecosystem-catalog-page__results-head">
              <div style={{ display: 'grid', gap: theme.spacing.sm }}>
                <h2 className="ecosystem-catalog-page__results-title">
                  {hasProducts ? 'Resultados disponibles' : 'Explorá el marketplace'}
                </h2>
                <p className="ecosystem-catalog-page__results-copy">
                  {hasProducts
                    ? `${productsCount} producto${productsCount === 1 ? '' : 's'} visibles con los filtros actuales.`
                    : 'Usá la búsqueda o los filtros para encontrar productos del ecosystem.'}
                </p>
                <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  {quickActions.map((action) => (
                    <Button key={action.id} type="button" variant="secondary" onClick={action.onClick}>
                      {action.label}
                    </Button>
                  ))}
                  <Button type="button" variant="ghost" onClick={() => navigate(routes.ecosystemStoresMap)}>
                    Buscar por tiendas en mapa
                  </Button>
                </div>
              </div>
              <Button type="button" variant="ghost" onClick={() => updateParams({ q: '', sort: 'default', deliverySupported: false })}>
                Limpiar filtros
              </Button>
            </SurfaceCard>

            {catalog.productsError ? <ErrorState message={catalog.productsError} /> : null}
            {catalog.isLoading ? (
              <LoadingState label="Cargando catálogo del ecosystem..." />
            ) : hasProducts ? (
              <EcosystemCatalogGrid
                ecosystem={catalog.ecosystem ?? { id: 'fallback', slug: catalog.slug, name: title, promotions: [] }}
                products={catalog.products}
                cartQtyByProductId={cartQtyByProductId}
                onAddProduct={(product) => cart.addItem({
                  externalProductId: product.id,
                  name: product.name,
                  unitPriceAmount: product.priceAmount,
                  currency: product.currency,
                  deliverySupported: product.deliverySupported
                })}
              />
            ) : !catalog.productsError ? (
              <EmptyState
                title="No hay productos para esos filtros"
                description="No encontramos coincidencias. Probá una búsqueda más corta, quitá filtros o abrí el mapa para entrar por tienda cuando todavía no sabés el nombre exacto del producto."
                actionLabel="Ver todo"
                onAction={() => setSearchParams(new URLSearchParams())}
              />
            ) : null}
            {catalog.ecosystemError && !hasProducts ? (
              <ErrorState message={catalog.ecosystemError} />
            ) : null}
            <Button type="button" variant="ghost" onClick={() => updateParams({ q: '', sort: 'default', deliverySupported: false })}>
              Volver al inicio del ecosystem
            </Button>
          </section>
        </div>
      </main>
    </EcosystemLayout>
  )
}
