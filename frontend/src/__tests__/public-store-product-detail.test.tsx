import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

function metaContent(selector: string) {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content
}

function canonicalHref() {
  return document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
}

function telemetryEvents(handler: ReturnType<typeof mockFetch>) {
  return handler.mock.calls
    .filter(([url]) => String(url) === '/api/public/beta/telemetry')
    .map(([, init]) => JSON.parse(String(init?.body ?? '{}')) as {
      eventName: string
      storeSlug?: string
      productId?: string
      productSlug?: string
      metadata?: Record<string, string>
    })
}

const storeResponse = {
  slug: 'demo-store',
  id: 'store-id',
  name: 'Demo Store',
  capabilities: ['ABOUT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT', 'CONTACT'],
  categories: [{ id: 'cat-1', name: 'Panaderia', sortOrder: 10 }],
  promotions: []
}

const listedProduct = {
  priceCents: 1200,
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'pan-de-campo',
  name: 'Pan de campo',
  sku: 'SKU-PAN',
  stockQuantity: 8,
  isAvailable: true,
  categoryId: 'cat-1',
  categoryName: 'Panaderia'
}

const productDetail = {
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
    sku: 'SKU-PAN'
  }
}

function productsPage(content = [listedProduct]) {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1
  }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  document.head.querySelectorAll('meta[name="description"], meta[name="robots"], meta[property^="og:"], link[rel="canonical"]').forEach((node) => node.remove())
  Object.defineProperty(window.navigator, 'sendBeacon', {
    configurable: true,
    value: undefined
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('public store product detail', () => {
  it('renders a valid product detail route with SEO metadata', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetail },
      '/api/public/stores/demo-store/products': { body: [listedProduct] }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo?utm_source=test')
    await flush()
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Pan de campo')
    expect(document.body.textContent).toContain('Demo Store')
    expect(document.body.textContent).toContain('Panaderia')
    expect(document.body.textContent).toContain('SKU-PAN')
    expect(document.body.textContent).toContain('Imagen no disponible')
    expect(document.title).toBe('Pan de campo en Demo Store | Barmi')
    expect(metaContent('meta[name="description"]')).toBe('Compra Pan de campo en Demo Store. Precio y disponibilidad actualizados.')
    expect(metaContent('meta[name="robots"]')).toBe('index,follow')
    expect(canonicalHref()).toBe('http://localhost:3000/public/demo-store/products/pan-de-campo')

    const detailEvents = telemetryEvents(handler).filter((event) => event.eventName === 'public_product_detail_viewed')
    expect(detailEvents).toHaveLength(1)
    expect(detailEvents[0]).toMatchObject({
      storeSlug: 'demo-store',
      productSlug: 'pan-de-campo',
      metadata: {
        isAvailable: 'true',
        hasDescription: 'false',
        hasImage: 'false',
        categoryName: 'present'
      }
    })
    expect(JSON.stringify(detailEvents[0])).not.toContain('22222222-2222-2222-2222-222222222222')
    expect(JSON.stringify(detailEvents[0])).not.toContain('SKU-PAN')

    await cleanup()
  })

  it('updates metadata when navigating from detail back to the store catalog', async () => {
    mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetail },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        return { body: parsed.searchParams.has('page') ? productsPage() : [listedProduct] }
      },
      '/api/public/stores/demo-store': { body: storeResponse }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo')
    await flush()
    await flush()

    expect(document.title).toBe('Pan de campo en Demo Store | Barmi')

    const backButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Volver a la tienda')
    await clickElement(backButton)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/public/demo-store')
    expect(document.title).toBe('Demo Store | Barmi')
    expect(metaContent('meta[name="robots"]')).toBe('index,follow')
    expect(canonicalHref()).toBe('http://localhost:3000/public/demo-store')

    await cleanup()
  })

  it('keeps public layout catalog navigation scoped to the current detail store slug', async () => {
    mockFetch({
      '/api/public/stores/otra-store/products/pan-de-campo': {
        body: {
          ...productDetail,
          store: { ...productDetail.store, slug: 'otra-store', name: 'Otra Store' }
        }
      },
      '/api/public/stores/otra-store/products': {
        body: [{ ...listedProduct, slug: 'pan-de-campo' }]
      }
    })

    const { cleanup } = await renderAppAt('/public/otra-store/products/pan-de-campo')
    await flush()
    await flush()

    const catalogLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
      .find((link) => link.textContent === 'Catálogo')
    expect(catalogLink?.getAttribute('href')).toBe('/public/otra-store')

    await cleanup()
  })

  it('shows not found and noindex for a missing product', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store/products/no-existe': { status: 404, body: { error: { code: 'not_found', message: 'Not found', status: 404 } } }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/no-existe')
    await flush()
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Producto no encontrado')
    expect(metaContent('meta[name="robots"]')).toBe('noindex,follow')
    expect(canonicalHref()).toBe('http://localhost:3000/public/demo-store/products/no-existe')

    const notFoundEvents = telemetryEvents(handler).filter((event) => event.eventName === 'public_product_detail_not_found')
    expect(notFoundEvents).toHaveLength(1)
    expect(notFoundEvents[0]).toMatchObject({
      storeSlug: 'demo-store',
      productSlug: 'no-existe'
    })

    await cleanup()
  })

  it('treats product detail as unavailable and noindex when PRODUCTS is disabled', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          ...storeResponse,
          capabilities: ['ABOUT', 'CONTACT']
        }
      },
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetail },
      '/api/public/stores/demo-store/products': { body: [listedProduct] }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Producto no encontrado')
    expect(document.body.textContent).not.toContain('Agregar al carrito')
    expect(metaContent('meta[name="robots"]')).toBe('noindex,follow')

    await cleanup()
  })

  it('adds an available detail product to the store cart using the listed product id', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetail },
      '/api/public/stores/demo-store/products': { body: [listedProduct] }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo')
    await flush()
    await flush()

    const addButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Agregar al carrito') as HTMLButtonElement
    expect(addButton.disabled).toBe(false)
    await clickElement(addButton)
    await flush()

    expect(JSON.parse(window.localStorage.getItem('barmi.cart.v1') ?? '{}')).toMatchObject({
      storeSlug: 'demo-store',
      items: [
        {
          productId: '22222222-2222-2222-2222-222222222222',
          name: 'Pan de campo',
          priceCents: 1200,
          qty: 1
        }
      ]
    })

    const addEvents = telemetryEvents(handler).filter((event) => event.eventName === 'public_product_detail_add_to_cart')
    expect(addEvents).toHaveLength(1)
    expect(addEvents[0]).toMatchObject({
      storeSlug: 'demo-store',
      productSlug: 'pan-de-campo',
      metadata: {
        isAvailable: 'true',
        quantity: '1'
      }
    })
    expect(JSON.stringify(addEvents[0])).not.toContain('22222222-2222-2222-2222-222222222222')
    expect(JSON.stringify(addEvents[0])).not.toContain('SKU-PAN')

    await cleanup()
  })

  it('disables the detail CTA when the product is unavailable', async () => {
    mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': {
        body: {
          ...productDetail,
          product: { ...productDetail.product, isAvailable: false, stockQuantity: 0 }
        }
      },
      '/api/public/stores/demo-store/products': { body: [{ ...listedProduct, isAvailable: false, stockQuantity: 0 }] }
    })

    const { cleanup } = await renderAppAt('/public/demo-store/products/pan-de-campo')
    await flush()
    await flush()

    const button = Array.from(document.querySelectorAll('button')).find((candidate) => candidate.textContent === 'Sin stock') as HTMLButtonElement
    expect(button.disabled).toBe(true)

    await cleanup()
  })

  it('navigates from catalog to detail with product slug and keeps add-to-cart from navigating', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store/products/pan-de-campo': { body: productDetail },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        return { body: parsed.searchParams.has('page') ? productsPage() : [listedProduct] }
      },
      '/api/public/stores/demo-store': { body: storeResponse }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const addButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Agregar') as HTMLButtonElement
    await clickElement(addButton)
    await flush()
    expect(window.location.pathname).toBe('/public/demo-store')
    const legacyCatalogAddEvents = telemetryEvents(handler).filter((event) => event.eventName === 'product_click')
    expect(legacyCatalogAddEvents).toHaveLength(1)
    expect(legacyCatalogAddEvents[0]).toMatchObject({
      productSlug: 'pan-de-campo',
      metadata: {
        surface: 'public_store_catalog'
      }
    })
    expect(JSON.stringify(legacyCatalogAddEvents[0])).not.toContain('22222222-2222-2222-2222-222222222222')
    expect(JSON.stringify(legacyCatalogAddEvents[0])).not.toContain('SKU-PAN')

    const productLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
      .find((link) => link.textContent === 'Pan de campo')
    expect(productLink?.getAttribute('href')).toBe('/public/demo-store/products/pan-de-campo')
    expect(productLink?.getAttribute('href')).not.toContain('22222222-2222-2222-2222-222222222222')

    await clickElement(productLink)
    await flush()
    await flush()

    expect(window.location.pathname).toBe('/public/demo-store/products/pan-de-campo')
    expect(document.body.textContent).toContain('Agregar al carrito')

    const clickEvents = telemetryEvents(handler).filter((event) => event.eventName === 'public_product_card_clicked')
    expect(clickEvents).toHaveLength(1)
    expect(clickEvents[0]).toMatchObject({
      storeSlug: 'demo-store',
      productSlug: 'pan-de-campo',
      metadata: {
        source: 'public_store_catalog'
      }
    })
    expect(JSON.stringify(clickEvents[0])).not.toContain('22222222-2222-2222-2222-222222222222')
    expect(JSON.stringify(clickEvents[0])).not.toContain('SKU-PAN')

    await cleanup()
  })
})
