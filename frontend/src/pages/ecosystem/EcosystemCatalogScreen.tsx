import { useSearchParams } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import { EcosystemCatalogFilters, EcosystemCatalogGrid, useEcosystemCatalog } from '@/features/ecosystem'
import { useEcosystemCart } from '@/features/ecosystem/cart/ecosystemCartContext'
import type { PublicEcosystemCatalogSort } from '../../api/contracts/v1/public'

export default function EcosystemCatalogScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const query = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') ?? 'default') as PublicEcosystemCatalogSort
  const deliverySupportedOnly = searchParams.get('deliverySupported') === 'true'
  const catalog = useEcosystemCatalog(query, sort, deliverySupportedOnly)
  const cart = useEcosystemCart()
  const cartQtyByProductId = Object.fromEntries(cart.items.map((item) => [item.externalProductId, item.qty]))

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
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: isMobile ? theme.spacing.lg : theme.spacing.xxl, display: 'grid', gap: theme.spacing.xl }}>
        <section style={{ display: 'grid', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Badge variant="info">Catálogo</Badge>
            {catalog.ecosystem?.promotions.length ? <Badge variant="success">Promociones disponibles</Badge> : null}
          </div>
          <h1 style={{ margin: 0, color: theme.colors.textPrimary, fontSize: isMobile ? 32 : 42 }}>
            {catalog.ecosystem?.name ?? 'Demo Ecosystem'}
          </h1>
          <p style={{ margin: 0, color: theme.colors.textMuted, lineHeight: 1.6 }}>
            Catálogo público de productos externos del ecosystem.
          </p>
          {catalog.ecosystem?.promotions.length ? (
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              {catalog.ecosystem.promotions.map((promotion) => (
                <Badge key={promotion.code} variant="success">{promotion.shortLabel}</Badge>
              ))}
            </div>
          ) : null}
        </section>

        <div style={{ display: 'grid', gap: theme.spacing.xl, gridTemplateColumns: isMobile ? '1fr' : '300px minmax(0, 1fr)', alignItems: 'start' }}>
          <EcosystemCatalogFilters
            query={query}
            sort={sort}
            deliverySupportedOnly={deliverySupportedOnly}
            onQueryChange={(value) => updateParams({ q: value })}
            onSortChange={(value) => updateParams({ sort: value })}
            onDeliverySupportedOnlyChange={(value) => updateParams({ deliverySupported: value })}
          />

          <section style={{ display: 'grid', gap: theme.spacing.md }}>
            {catalog.error ? <ErrorState message={catalog.error} /> : null}
            {catalog.isLoading ? (
              <LoadingState label="Cargando catálogo del ecosystem..." />
            ) : catalog.ecosystem && catalog.products.length > 0 ? (
              <EcosystemCatalogGrid
                ecosystem={catalog.ecosystem}
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
            ) : !catalog.error ? (
              <EmptyState
                title="No hay productos para esos filtros"
                description="Probá cambiar la búsqueda, el orden o el filtro de entrega."
                actionLabel="Ver todo"
                onAction={() => setSearchParams(new URLSearchParams())}
              />
            ) : null}
            <Button type="button" variant="ghost" onClick={() => updateParams({ q: '', sort: 'default', deliverySupported: false })}>
              Volver a {routes.ecosystemHome}
            </Button>
          </section>
        </div>
      </main>
    </EcosystemLayout>
  )
}
