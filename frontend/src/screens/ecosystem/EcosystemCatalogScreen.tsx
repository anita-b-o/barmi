import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { PageHeader, SectionCard } from '../../design-system/patterns'
import { EmptyState, ErrorAlert, LoadingBlock } from '../../design-system/components'
import { theme } from '../../app/theme'
import { useEcosystemCatalog, EcosystemCatalogFilters, EcosystemCatalogGrid } from '../../modules/ecosystem'
import { useEcosystemCart } from '../../ui/state/ecosystemCartContext'
import { routes } from '../../core/constants/routes'

export default function EcosystemCatalogScreen() {
  const [query, setQuery] = useState('')
  const catalog = useEcosystemCatalog(query)
  const cart = useEcosystemCart()
  const cartItemsCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.qty, 0), [cart.items])
  const cartQtyByProductId = useMemo(
    () => Object.fromEntries(cart.items.map((item) => [item.externalProductId, item.qty])),
    [cart.items]
  )

  return (
    <EcosystemLayout>
      <PageHeader
        title={catalog.ecosystem?.name ?? 'Marketplace Ecosystem'}
        subtitle={`Slug público: ${catalog.slug}`}
        actions={<Link to={routes.ecosystemCheckout} style={{ color: theme.colors.primary, textDecoration: 'none' }}>Checkout ({cartItemsCount})</Link>}
      />

      <div style={{ marginTop: theme.spacing.xl }}>
        <ErrorAlert message="Limitación backend: no existe endpoint público de detalle, categorías ni paginación para productos del ecosystem." />
      </div>

      <div style={{ marginTop: theme.spacing.xl }}>
        <EcosystemCatalogFilters query={query} onQueryChange={setQuery} />
      </div>

      {catalog.error && (
        <div style={{ marginTop: theme.spacing.xl }}>
          <ErrorAlert message={catalog.error} />
        </div>
      )}

      {catalog.isLoading ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <LoadingBlock label="Cargando catálogo del ecosystem..." />
        </div>
      ) : !catalog.ecosystem || catalog.products.length === 0 ? (
        <div style={{ marginTop: theme.spacing.xl }}>
          <EmptyState
            title={query.trim() ? 'No hay productos para esa búsqueda' : 'No hay productos externos disponibles'}
            description={query.trim() ? 'Probá con otro texto de búsqueda.' : undefined}
          />
        </div>
      ) : (
        <div style={{ marginTop: theme.spacing.xl }}>
          <SectionCard title="Productos externos">
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
          </SectionCard>
        </div>
      )}
    </EcosystemLayout>
  )
}
