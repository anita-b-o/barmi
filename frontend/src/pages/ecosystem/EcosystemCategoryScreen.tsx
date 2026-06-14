import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { appConfig } from '@/app/config/env'
import { theme } from '@/app/theme'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import { routes } from '@/core/constants/routes'
import { buildCanonicalUrl, useJsonLd, useSeoMetadata } from '@/core/seo'
import { normalizeEcosystemStoresMapFilters } from '@/features/ecosystem/discovery'
import { StoreCard } from '@/features/ecosystem/components/StoreCard'
import { SurfaceCard } from '@/features/ecosystem/components/SurfaceCard'
import { useEcosystemStoresMapData } from '@/features/ecosystem/stores-map/hooks/useEcosystemStoresMapData'
import { EcosystemLayout } from '../../layouts'
import '@/features/ecosystem/components/ecosystem-marketplace.css'

function formatFallbackCategoryName(categorySlug: string) {
  return categorySlug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Categoria'
}

function normalizeCategorySlug(categorySlug: string) {
  try {
    return decodeURIComponent(categorySlug).trim().toLowerCase()
  } catch {
    return categorySlug.trim().toLowerCase()
  }
}

export default function EcosystemCategoryScreen() {
  const navigate = useNavigate()
  const { categorySlug = '' } = useParams()
  const normalizedCategorySlug = normalizeCategorySlug(categorySlug)
  const filters = normalizeEcosystemStoresMapFilters({
    category: normalizedCategorySlug,
    location: 'all',
    sort: 'name,asc'
  })
  const {
    storesMapData,
    stores,
    isInitialLoading,
    isUpdating,
    error
  } = useEcosystemStoresMapData(appConfig.publicEcosystemSlug, filters)

  const ecosystemName = storesMapData?.ecosystem.name ?? 'Barmi'
  const categoryFacet = storesMapData?.categories.find((category) => category.key === normalizedCategorySlug)
  const categoryName = categoryFacet?.label ?? formatFallbackCategoryName(normalizedCategorySlug)
  const categoryPath = routes.ecosystemCategory(normalizedCategorySlug)
  const hasIndexableCategoryLanding = Boolean(categoryFacet && stores.length > 0)
  const shouldNoindex = Boolean(error) || (!isInitialLoading && !hasIndexableCategoryLanding)

  useSeoMetadata({
    title: `${categoryName} en ${ecosystemName} | Barmi`,
    description: `Explora tiendas y productos de ${categoryName} en ${ecosystemName}.`,
    path: categoryPath,
    robots: shouldNoindex ? 'noindex,follow' : 'index,follow'
  })
  const jsonLd = useMemo(() => hasIndexableCategoryLanding ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${categoryName} en ${ecosystemName}`,
        url: buildCanonicalUrl(categoryPath),
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: stores.map((store, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Store',
              name: store.name,
              url: buildCanonicalUrl(routes.publicStore(store.slug))
            }
          }))
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Ecosystem',
            item: buildCanonicalUrl(routes.ecosystemHome)
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: categoryName,
            item: buildCanonicalUrl(categoryPath)
          }
        ]
      }
    ]
  } : null, [categoryName, categoryPath, ecosystemName, hasIndexableCategoryLanding, stores])
  useJsonLd({
    id: `ecosystem-category-${normalizedCategorySlug}`,
    path: categoryPath,
    robots: shouldNoindex ? 'noindex,follow' : 'index,follow',
    data: jsonLd
  })

  const catalogHref = `${routes.ecosystemCatalog}?q=${encodeURIComponent(categoryName)}`
  const mapHref = `${routes.ecosystemStoresMap}?category=${encodeURIComponent(normalizedCategorySlug)}&location=all`

  return (
    <EcosystemLayout>
      <main className="ecosystem-catalog-page">
        <SurfaceCard variant="inverse" className="ecosystem-catalog-page__hero">
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Badge variant="info">Categoria</Badge>
            {categoryFacet ? <Badge variant="success">{categoryFacet.storeCount} tiendas</Badge> : null}
            {isUpdating ? <Badge variant="neutral">Actualizando</Badge> : null}
          </div>
          <h1>{categoryName} en {ecosystemName}</h1>
          <p style={{ margin: 0, color: 'var(--barmi-color-text-muted)', lineHeight: 1.6 }}>
            Explora tiendas de esta categoria dentro del ecosystem. El catalogo general sigue disponible para buscar productos por texto.
          </p>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button type="button" variant="primary" onClick={() => navigate(mapHref)}>
              Ver en mapa
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(catalogHref)}>
              Buscar productos
            </Button>
          </div>
        </SurfaceCard>

        <section className="ecosystem-stack">
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', color: 'var(--barmi-color-text-muted)' }}>
            <Link to={routes.ecosystemHome}>Ecosystem</Link>
            <span>/</span>
            <Link to={routes.ecosystemStoresMap}>Tiendas</Link>
            <span>/</span>
            <span>{categoryName}</span>
          </div>

          {isInitialLoading ? <LoadingState label="Cargando categoria..." /> : null}

          {error ? (
            <ErrorState
              message="No pudimos cargar esta categoria publica. Puede no existir o no estar disponible para discovery."
              actionLabel="Volver al catalogo"
              onAction={() => navigate(routes.ecosystemCatalog)}
            />
          ) : null}

          {!isInitialLoading && !error && stores.length === 0 ? (
            <EmptyState
              title="No hay tiendas activas para esta categoria"
              description="Esta landing publica existe solo cuando hay tiendas activas asociadas. Podes volver al mapa para explorar otras categorias."
              actionLabel="Ver mapa"
              onAction={() => navigate(routes.ecosystemStoresMap)}
            />
          ) : null}

          {stores.length > 0 ? (
            <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
              {stores.map((store) => (
                <StoreCard
                  key={store.id}
                  layout="list"
                  store={{
                    id: store.id,
                    name: store.name,
                    storeHref: routes.publicStore(store.slug),
                    categoryLabel: store.category?.label ?? null,
                    locationLabel: store.locationLabel,
                    hasPublicLocation: store.hasPublicLocation
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </EcosystemLayout>
  )
}
