import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EcosystemLayout } from '../../layouts'
import { appConfig } from '@/app/config/env'
import { publicEcosystemAdapter } from '../../api/adapters/publicEcosystemAdapter'
import { ecosystemDiscoveryQueryKeys, normalizeEcosystemCatalogFilters, normalizeEcosystemStoresMapFilters } from '@/features/ecosystem/discovery'
import {
  buildEcosystemStoreRailGroups,
  buildEcosystemProductRailGroups,
  buildMixedHomeSections,
  EcosystemHomeContentSections,
  EcosystemHomeHeroSection
} from '@/features/ecosystem'
import { trackBetaEvent } from '@/features/beta'
import { buildCanonicalUrl, useJsonLd, useSeoMetadata } from '@/core/seo'
import { routes } from '@/core/constants/routes'

const ECOSYSTEM_HOME_PRODUCTS_SIZE = 12

export default function EcosystemHomeScreen() {
  const slug = appConfig.publicEcosystemSlug
  const productFilters = normalizeEcosystemCatalogFilters({ page: 0, size: ECOSYSTEM_HOME_PRODUCTS_SIZE })
  const storesMapFilters = normalizeEcosystemStoresMapFilters({ location: 'all' })

  useEffect(() => {
    trackBetaEvent({
      eventName: 'ecosystem_home_view',
      ecosystemSlug: slug
    })
  }, [slug])

  const homeQuery = useQuery({
    queryKey: ecosystemDiscoveryQueryKeys.home(slug),
    queryFn: () => publicEcosystemAdapter.getHome(slug)
  })
  const productsQuery = useQuery({
    queryKey: ecosystemDiscoveryQueryKeys.products(slug, productFilters),
    queryFn: () => publicEcosystemAdapter.listProducts(slug, {
      query: productFilters.query,
      activeOnly: true,
      sort: productFilters.sort,
      deliverySupported: productFilters.deliverySupported ? true : undefined,
      page: productFilters.page,
      size: productFilters.size
    })
  })
  const storesMapQuery = useQuery({
    queryKey: ecosystemDiscoveryQueryKeys.storesMap(slug, storesMapFilters),
    queryFn: () => publicEcosystemAdapter.getStoresMap(slug, {
      query: storesMapFilters.query,
      category: storesMapFilters.category,
      location: storesMapFilters.location,
      sort: storesMapFilters.sort
    })
  })

  const allProducts = productsQuery.data?.content ?? []
  const home = homeQuery.data ?? null
  const ecosystemName = home?.ecosystem.name ?? 'Barmi'
  useSeoMetadata({
    title: `${ecosystemName} | Barmi`,
    description: `Descubri tiendas, productos y promociones de ${ecosystemName} en Barmi.`,
    path: routes.ecosystemHome
  })
  const jsonLd = useMemo(() => home?.ecosystem.name ? {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${home.ecosystem.name} | Barmi`,
    url: buildCanonicalUrl(routes.ecosystemHome)
  } : null, [home?.ecosystem.name])
  useJsonLd({
    id: 'ecosystem-home',
    path: routes.ecosystemHome,
    data: jsonLd
  })
  const featuredStores = storesMapQuery.data?.stores ?? []
  const storeCount = featuredStores.length || home?.newStores.length || 0
  const productCount = allProducts.length || home?.promotionProducts.length || 0
  const categoryCount = home?.storeCategories.length ?? 0

  const storeRailGroups = useMemo(
    () => buildEcosystemStoreRailGroups({ home, mapStores: featuredStores, products: allProducts }),
    [allProducts, featuredStores, home]
  )
  const productRailGroups = useMemo(
    () => buildEcosystemProductRailGroups({ home, products: allProducts }),
    [allProducts, home]
  )
  const homeContentSections = useMemo(
    () => buildMixedHomeSections(productRailGroups, storeRailGroups),
    [productRailGroups, storeRailGroups]
  )

  return (
    <EcosystemLayout>
      <main className="ecosystem-home-page">
        <EcosystemHomeHeroSection
          storeCount={storeCount}
          productCount={productCount}
          categoryCount={categoryCount}
        />
        <EcosystemHomeContentSections sections={homeContentSections} />
      </main>
    </EcosystemLayout>
  )
}
