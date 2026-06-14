import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyJsonLd } from '@/core/seo'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

function jsonLdScripts() {
  return Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"][data-barmi-jsonld="true"]'))
}

function parsedJsonLd() {
  return jsonLdScripts().map((script) => JSON.parse(script.textContent ?? '{}'))
}

function firstJsonLd() {
  return parsedJsonLd()[0]
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(collectStringValues)
  return Object.values(value).flatMap(collectStringValues)
}

function expectAllUrlsAbsolute(value: unknown) {
  const urls = collectStringValues(value).filter((item) => item.startsWith('http') || item.startsWith('/'))
  expect(urls.length).toBeGreaterThan(0)
  expect(urls.every((item) => item.startsWith('http://localhost:3000/') || item.startsWith('https://schema.org'))).toBe(true)
}

const ecosystem = { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] }

const ecosystemProductsPage = {
  content: [
    { id: 'ext-1', slug: 'ext-1', name: 'External Apple', priceAmount: 150, currency: 'ARS', deliverySupported: true },
    { id: 'ext-2', slug: 'ext-2', name: 'External Bread', priceAmount: 90, currency: 'ARS', deliverySupported: false }
  ],
  page: 0,
  size: 24,
  totalElements: 2,
  totalPages: 1
}

const storesMapBody = {
  ecosystem,
  categories: [{ key: 'panaderia', label: 'Panaderia', storeCount: 1 }],
  stores: [{
    id: 's1',
    slug: 'la-miga',
    name: 'La Miga',
    category: { key: 'panaderia', label: 'Panaderia' },
    hasPublicLocation: true,
    locationLabel: 'Centro',
    latitude: -34.9,
    longitude: -57.9,
    createdAt: '2026-01-01T00:00:00Z'
  }]
}

const publicStoreBody = {
  slug: 'demo-store',
  id: 'store-private-id',
  name: 'Demo Store',
  categories: [{ id: 'category-private-id', slug: 'category-private-id', name: 'Panaderia', sortOrder: 1 }],
  promotions: []
}

const publicStoreProductsPage = {
  content: [
    {
      id: 'product-private-id',
      slug: 'pan-de-campo',
      name: 'Pan de campo',
      sku: 'SKU-PRIVATE',
      priceCents: 1200,
      stockQuantity: 8,
      isAvailable: true,
      categoryId: 'category-private-id',
      categoryName: 'Panaderia'
    }
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1
}

const productDetailBody = {
  store: {
    slug: 'demo-store',
    name: 'Demo Store',
    categoryName: 'Panaderia'
  },
  product: {
    slug: 'pan-de-campo',
    name: 'Pan de campo',
    priceCents: 1200,
    currency: 'ARS',
    isAvailable: true,
    stockQuantity: 8,
    categoryName: 'Panaderia',
    description: null,
    imageUrl: null,
    sku: 'SKU-PRIVATE'
  }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  document.head.querySelectorAll('meta[name="description"], meta[name="robots"], meta[property^="og:"], link[rel="canonical"], script[type="application/ld+json"][data-barmi-jsonld="true"]').forEach((node) => node.remove())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('public JSON-LD metadata', () => {
  it('appears on ecosystem home as parseable WebSite JSON-LD', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/home': {
        body: {
          ecosystem,
          newStores: [],
          storeCategories: [],
          promotionProducts: [],
          deliveryProducts: []
        }
      },
      '/api/public/ecosystems/demo-ecosystem/products?activeOnly=true': { body: { ...ecosystemProductsPage, size: 12 } },
      '/api/public/ecosystems/demo-ecosystem/stores/map?location=all': {
        body: { ecosystem, categories: [], stores: [] }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()

    expect(jsonLdScripts()).toHaveLength(1)
    expect(firstJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Demo Ecosystem | Barmi',
      url: 'http://localhost:3000/ecosystem'
    })
    expectAllUrlsAbsolute(firstJsonLd())
    await cleanup()
  })

  it('appears on ecosystem catalog as CollectionPage JSON-LD', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystem },
      '/api/public/ecosystems/demo-ecosystem/products': { body: ecosystemProductsPage }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog')
    await flush()
    await flush()

    expect(jsonLdScripts()).toHaveLength(1)
    expect(firstJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Productos en Demo Ecosystem',
      url: 'http://localhost:3000/ecosystem/catalog',
      mainEntity: {
        '@type': 'ItemList'
      }
    })
    expect(firstJsonLd().mainEntity.itemListElement).toEqual(expect.arrayContaining([
      { '@type': 'ListItem', position: 1, item: { '@type': 'Thing', name: 'External Apple' } },
      { '@type': 'ListItem', position: 2, item: { '@type': 'Thing', name: 'External Bread' } }
    ]))
    expectAllUrlsAbsolute(firstJsonLd())
    await cleanup()
  })

  it('appears on a valid public store without internal identifiers', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: publicStoreBody },
      '/api/public/stores/demo-store/products': { body: publicStoreProductsPage }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const rawJsonLd = jsonLdScripts()[0]?.textContent ?? ''
    expect(jsonLdScripts()).toHaveLength(1)
    expect(firstJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Store',
          name: 'Demo Store',
          url: 'http://localhost:3000/public/demo-store',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, item: { '@type': 'Thing', name: 'Pan de campo' } }
            ]
          }
        },
        { '@type': 'BreadcrumbList' }
      ]
    })
    expect(rawJsonLd).not.toContain('store-private-id')
    expect(rawJsonLd).not.toContain('product-private-id')
    expect(rawJsonLd).not.toContain('SKU-PRIVATE')
    expect(firstJsonLd()['@graph'][0]).not.toHaveProperty('additionalType')
    expect(firstJsonLd()['@graph'][1].itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ecosystem',
        item: 'http://localhost:3000/ecosystem'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Demo Store',
        item: 'http://localhost:3000/public/demo-store'
      }
    ])
    expectAllUrlsAbsolute(firstJsonLd())
    await cleanup()
  })

  it('appears on a valid category landing as CollectionPage and BreadcrumbList JSON-LD', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': { body: storesMapBody }
    })

    const { cleanup } = await renderAppAt('/ecosystem/categories/panaderia')
    await flush()
    await flush()

    expect(jsonLdScripts()).toHaveLength(1)
    expect(firstJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: 'Panaderia en Demo Ecosystem',
          url: 'http://localhost:3000/ecosystem/categories/panaderia',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                item: {
                  '@type': 'Store',
                  name: 'La Miga',
                  url: 'http://localhost:3000/public/la-miga'
                }
              }
            ]
          }
        },
        { '@type': 'BreadcrumbList' }
      ]
    })
    expect(firstJsonLd()['@graph'][1].itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ecosystem',
        item: 'http://localhost:3000/ecosystem'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Panaderia',
        item: 'http://localhost:3000/ecosystem/categories/panaderia'
      }
    ])
    expectAllUrlsAbsolute(firstJsonLd())
    await cleanup()
  })

  it('does not appear when an indexable route has active query params', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystem },
      '/api/public/ecosystems/demo-ecosystem/products': { body: ecosystemProductsPage }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog?q=apple')
    await flush()
    await flush()

    expect(jsonLdScripts()).toHaveLength(0)
    await cleanup()
  })

  it('appears on a valid product detail as conservative Product JSON-LD', async () => {
    mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetailBody },
      '/api/public/stores/demo-store/products': { body: publicStoreProductsPage.content }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo')
    await flush()
    await flush()

    const rawJsonLd = jsonLdScripts()[0]?.textContent ?? ''
    expect(jsonLdScripts()).toHaveLength(1)
    expect(firstJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Pan de campo',
      description: 'Producto publicado por Demo Store en Barmi.',
      offers: {
        '@type': 'Offer',
        price: '12.00',
        priceCurrency: 'ARS',
        availability: 'https://schema.org/InStock',
        url: 'http://localhost:3000/public/demo-store/products/pan-de-campo',
        seller: {
          '@type': 'Store',
          name: 'Demo Store',
          url: 'http://localhost:3000/public/demo-store'
        }
      }
    })
    expect(firstJsonLd()).not.toHaveProperty('image')
    expect(rawJsonLd).not.toContain('product-private-id')
    expect(rawJsonLd).not.toContain('store-private-id')
    expect(rawJsonLd).not.toContain('category-private-id')
    expect(rawJsonLd).not.toContain('SKU-PRIVATE')
    expectAllUrlsAbsolute(firstJsonLd())
    await cleanup()
  })

  it('sets Product JSON-LD OutOfStock and includes image only when imageUrl exists', async () => {
    mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': {
        body: {
          ...productDetailBody,
          product: {
            ...productDetailBody.product,
            isAvailable: false,
            stockQuantity: 0,
            description: 'Pan artesanal de masa madre.',
            imageUrl: 'http://localhost:3000/images/pan-de-campo.jpg'
          }
        }
      },
      '/api/public/stores/demo-store/products': {
        body: [{ ...publicStoreProductsPage.content[0], isAvailable: false, stockQuantity: 0 }]
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo')
    await flush()
    await flush()

    expect(firstJsonLd()).toMatchObject({
      '@type': 'Product',
      description: 'Pan artesanal de masa madre.',
      image: 'http://localhost:3000/images/pan-de-campo.jpg',
      offers: {
        availability: 'https://schema.org/OutOfStock'
      }
    })
    await cleanup()
  })

  it('does not emit Product JSON-LD for product 404 or active query params', async () => {
    mockFetch({
      '/api/public/stores/demo-store/products/no-existe': {
        status: 404,
        body: { error: { code: 'not_found', message: 'Not found', status: 404 } }
      },
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetailBody },
      '/api/public/stores/demo-store/products': { body: publicStoreProductsPage.content }
    })

    const missing = await renderAppAt('/public/demo-store/products/no-existe')
    await flush()
    await flush()
    expect(jsonLdScripts()).toHaveLength(0)
    await missing.cleanup()

    const queried = await renderAppAt('/public/demo-store/products/pan-de-campo?utm_source=test')
    await flush()
    await flush()
    expect(jsonLdScripts()).toHaveLength(0)
    await queried.cleanup()
  })

  it('cleans up Product JSON-LD when navigating from detail back to the store catalog', async () => {
    mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetailBody },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        return { body: parsed.searchParams.has('page') ? publicStoreProductsPage : publicStoreProductsPage.content }
      },
      '/api/public/stores/demo-store': { body: publicStoreBody }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo')
    await flush()
    await flush()
    expect(firstJsonLd()).toMatchObject({ '@type': 'Product' })

    const backButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Volver a la tienda')
    await clickElement(backButton)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/public/demo-store')
    expect(jsonLdScripts()).toHaveLength(1)
    expect(firstJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Store' },
        { '@type': 'BreadcrumbList' }
      ]
    })
    await cleanup()
  })

  it('does not appear on a missing noindex category landing', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        status: 400,
        body: { error: { code: 'invalid_store_category', message: 'invalid_store_category', status: 400 } }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/categories/no-existe')
    await flush()
    await flush()

    expect(jsonLdScripts()).toHaveLength(0)
    await cleanup()
  })

  it('does not appear on the noindex stores map', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        body: { ecosystem, categories: [], stores: [] }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map')
    await flush()
    await flush()

    expect(jsonLdScripts()).toHaveLength(0)
    await cleanup()
  })

  it('cleans up managed JSON-LD when navigating from an indexable route to a noindex route', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/home': {
        body: {
          ecosystem,
          newStores: [],
          storeCategories: [],
          promotionProducts: [],
          deliveryProducts: []
        }
      },
      '/api/public/ecosystems/demo-ecosystem/products?activeOnly=true': { body: { ...ecosystemProductsPage, size: 12 } },
      '/api/public/ecosystems/demo-ecosystem/stores/map?location=all': {
        body: { ecosystem, categories: [], stores: [] }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()
    expect(jsonLdScripts()).toHaveLength(1)

    const mapLink = document.querySelector('a[href="/ecosystem/stores/map"]')
    await clickElement(mapLink)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/ecosystem/stores/map')
    expect(jsonLdScripts()).toHaveLength(0)
    await cleanup()
  })

  it('sanitizes internal identifiers, SKU and sensitive keys before insertion', () => {
    window.history.pushState({}, '', '/ecosystem')

    applyJsonLd({
      id: 'sanitization-check',
      path: '/ecosystem',
      data: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Safe Site',
        url: 'http://localhost:3000/ecosystem',
        id: 'internal-id',
        categoryId: 'category-id',
        accessToken: 'private-token',
        adminUrl: 'http://localhost:3000/admin',
        item: {
          '@type': 'Thing',
          name: 'Visible item',
          sku: 'SKU-PRIVATE',
          privateEmail: 'owner@example.test'
        }
      }
    })

    const rawJsonLd = jsonLdScripts()[0]?.textContent ?? ''
    expect(JSON.parse(rawJsonLd)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Safe Site',
      url: 'http://localhost:3000/ecosystem',
      item: {
        '@type': 'Thing',
        name: 'Visible item'
      }
    })
    expect(rawJsonLd).not.toContain('internal-id')
    expect(rawJsonLd).not.toContain('category-id')
    expect(rawJsonLd).not.toContain('private-token')
    expect(rawJsonLd).not.toContain('/admin')
    expect(rawJsonLd).not.toContain('SKU-PRIVATE')
    expect(rawJsonLd).not.toContain('owner@example.test')
  })
})
