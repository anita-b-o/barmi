import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EcosystemLayout } from '../../layouts'
import { appConfig } from '@/app/config/env'
import { publicEcosystemAdapter } from '../../api/adapters/publicEcosystemAdapter'
import {
  buildEcosystemStoreRailGroups,
  buildEcosystemProductRailGroups,
  buildMixedHomeSections,
  EcosystemHomeContentSections,
  EcosystemHomeHeroSection
} from '@/features/ecosystem'

export default function EcosystemHomeScreen() {
  const slug = appConfig.publicEcosystemSlug

  const homeQuery = useQuery({
    queryKey: ['public-ecosystem-home', slug],
    queryFn: () => publicEcosystemAdapter.getHome(slug)
  })
  const productsQuery = useQuery({
    queryKey: ['public-ecosystem-home-products', slug],
    queryFn: () => publicEcosystemAdapter.listProducts(slug, { activeOnly: true })
  })
  const storesMapQuery = useQuery({
    queryKey: ['public-ecosystem-home-stores-map', slug],
    queryFn: () => publicEcosystemAdapter.getStoresMap(slug, { location: 'all' })
  })

  const allProducts = productsQuery.data ?? []
  const home = homeQuery.data ?? null
  const featuredStores = storesMapQuery.data?.stores ?? []

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
      <EcosystemHomeHeroSection />
      <EcosystemHomeContentSections sections={homeContentSections} />
    </EcosystemLayout>
  )
}
