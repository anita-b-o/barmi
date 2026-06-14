import { describe, expect, it } from 'vitest'
import catalogHookSource from '../../catalog/hooks/useEcosystemCatalog.ts?raw'
import {
  ecosystemDiscoveryQueryKeys,
  normalizeEcosystemCatalogFilters,
  normalizeEcosystemStoresMapFilters
} from '@/features/ecosystem/discovery'
import {
  buildEcosystemCatalogSearchParams,
  buildEcosystemStoresMapSearchParams,
  buildEcosystemStoresMapSelectionSearchParams,
  clearEcosystemCatalogSearchParams,
  readEcosystemCatalogUrlState,
  readEcosystemStoresMapUrlState
} from '@/features/ecosystem/discovery/urlState'

describe('ecosystem discovery helpers', () => {
  it('normalizes catalog filters with stable defaults', () => {
    expect(normalizeEcosystemCatalogFilters()).toEqual({
      query: '',
      sort: 'default',
      deliverySupported: false,
      page: 0,
      size: 24
    })
    expect(normalizeEcosystemCatalogFilters({
      query: '  cafe  ',
      sort: 'relevance',
      deliverySupported: 'true',
      page: '2',
      size: '50'
    })).toEqual({
      query: 'cafe',
      sort: 'relevance',
      deliverySupported: true,
      page: 2,
      size: 50
    })
    expect(normalizeEcosystemCatalogFilters({
      query: 'banana',
      sort: 'unknown',
      deliverySupported: 'false',
      page: '-2',
      size: 'bad'
    })).toEqual({
      query: 'banana',
      sort: 'default',
      deliverySupported: false,
      page: 0,
      size: 24
    })
  })

  it('normalizes stores map filters with stable defaults', () => {
    expect(normalizeEcosystemStoresMapFilters()).toEqual({
      query: '',
      category: '',
      location: 'mapped',
      sort: 'name,asc',
      selectedStoreId: null
    })
    expect(normalizeEcosystemStoresMapFilters({
      query: '  pizza  ',
      category: '  restaurants ',
      location: 'all',
      sort: 'recent',
      selectedStoreId: ' store-1 '
    })).toEqual({
      query: 'pizza',
      category: 'restaurants',
      location: 'all',
      sort: 'recent',
      selectedStoreId: 'store-1'
    })
    expect(normalizeEcosystemStoresMapFilters({
      location: 'nearby',
      sort: 'distance',
      selectedStoreId: '   '
    })).toEqual({
      query: '',
      category: '',
      location: 'mapped',
      sort: 'name,asc',
      selectedStoreId: null
    })
  })

  it('builds canonical query keys for discovery cache reuse', () => {
    expect(ecosystemDiscoveryQueryKeys.publicEcosystem('demo')).toEqual(['public-ecosystem', 'demo'])
    expect(ecosystemDiscoveryQueryKeys.home('demo')).toEqual(['public-ecosystem-home', 'demo'])
    expect(ecosystemDiscoveryQueryKeys.products('demo')).toEqual([
      'public-ecosystem-products',
      'demo',
      '',
      'default',
      false,
      0,
      24
    ])
    expect(ecosystemDiscoveryQueryKeys.products('demo', {
      query: '  apple ',
      sort: 'price,desc',
      deliverySupported: true,
      page: 3,
      size: 48
    })).toEqual([
      'public-ecosystem-products',
      'demo',
      'apple',
      'price,desc',
      true,
      3,
      48
    ])
    expect(ecosystemDiscoveryQueryKeys.storesMap('demo', { location: 'all' })).toEqual([
      'public-ecosystem-stores-map',
      'demo',
      '',
      '',
      'all',
      'name,asc'
    ])
  })

  it('keeps equivalent default filters on the same products cache key', () => {
    expect(ecosystemDiscoveryQueryKeys.products('demo')).toEqual(
      ecosystemDiscoveryQueryKeys.products('demo', {
        query: '   ',
        sort: 'unknown',
        deliverySupported: false,
        page: 0,
        size: 24
      })
    )
    expect(ecosystemDiscoveryQueryKeys.products('demo')).toEqual(
      ecosystemDiscoveryQueryKeys.products('demo', normalizeEcosystemCatalogFilters())
    )
  })

  it('keeps previous product page data configured for catalog pagination', () => {
    expect(catalogHookSource).toContain('placeholderData: keepPreviousData')
  })

  it('keeps selected store out of stores map cache identity', () => {
    expect(ecosystemDiscoveryQueryKeys.storesMap('demo', {
      query: ' pizza ',
      category: ' food ',
      location: 'all',
      selectedStoreId: 'store-1'
    })).toEqual(ecosystemDiscoveryQueryKeys.storesMap('demo', {
      query: 'pizza',
      category: 'food',
      location: 'all',
      selectedStoreId: 'store-2'
    }))
  })

  it('reads catalog URL state with the same normalization used by query keys', () => {
    const params = new URLSearchParams('q=%20apple%20&sort=relevance&deliverySupported=true&page=2')
    const filters = readEcosystemCatalogUrlState(params)

    expect(filters).toEqual({
      query: 'apple',
      sort: 'relevance',
      deliverySupported: true,
      page: 2,
      size: 24
    })
    expect(ecosystemDiscoveryQueryKeys.products('demo', filters)).toEqual([
      'public-ecosystem-products',
      'demo',
      'apple',
      'relevance',
      true,
      2,
      24
    ])
  })

  it('does not write catalog defaults and removes empty params while preserving unrelated params', () => {
    const current = new URLSearchParams('q=apple&sort=price%2Casc&deliverySupported=true&page=4&utm=keep')
    const next = buildEcosystemCatalogSearchParams(current, {
      q: '   ',
      sort: 'default',
      deliverySupported: false
    })

    expect(next.toString()).toBe('utm=keep')
    expect(clearEcosystemCatalogSearchParams(current).toString()).toBe('utm=keep')
  })

  it('updates catalog page without losing filters and resets page when filters change', () => {
    const current = new URLSearchParams('q=apple&sort=price%2Casc&deliverySupported=true&page=3&utm=keep')

    expect(buildEcosystemCatalogSearchParams(current, { page: 4 }).toString()).toBe(
      'q=apple&sort=price%2Casc&deliverySupported=true&page=4&utm=keep'
    )
    expect(buildEcosystemCatalogSearchParams(current, { q: 'banana' }).toString()).toBe(
      'q=banana&sort=price%2Casc&deliverySupported=true&utm=keep'
    )

    expect(buildEcosystemCatalogSearchParams(current, { sort: 'relevance' }).toString()).toBe(
      'q=apple&sort=relevance&deliverySupported=true&utm=keep'
    )
  })

  it('reads stores map URL state with the same normalization used by query keys', () => {
    const params = new URLSearchParams('q=%20pizza%20&category=%20food%20&location=bad&store=%20store-1%20')
    const filters = readEcosystemStoresMapUrlState(params)

    expect(filters).toEqual({
      query: 'pizza',
      category: 'food',
      location: 'mapped',
      sort: 'name,asc',
      selectedStoreId: 'store-1'
    })
    expect(ecosystemDiscoveryQueryKeys.storesMap('demo', filters)).toEqual([
      'public-ecosystem-stores-map',
      'demo',
      'pizza',
      'food',
      'mapped',
      'name,asc'
    ])
  })

  it('cleans stores map defaults and filter changes clear only the selected store', () => {
    const current = new URLSearchParams('q=old&category=food&location=all&store=store-1&utm=keep')
    const next = buildEcosystemStoresMapSearchParams(current, {
      q: '   ',
      category: '',
      location: 'mapped'
    })

    expect(next.toString()).toBe('utm=keep')
    expect(buildEcosystemStoresMapSelectionSearchParams(next, ' store-2 ').toString()).toBe('utm=keep&store=store-2')
  })
})
