import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setInputElementValue, setSelectElementValue } from '../test-utils/testUtils'

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
  id: 's1',
  name: 'Demo Store',
  appearance: 'LOCAL_BUSINESS',
  capabilities: ['ABOUT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CHECKOUT', 'CONTACT'],
  profile: {
    description: 'Cafetería de especialidad con desayunos y atención de barrio.',
    email: 'hola@demo.test',
    phone: '221 555 0101',
    whatsapp: '+54 9 221 555 0101'
  },
  categories: [
    { id: 'cat-1', slug: 'cat-1', name: 'Bebidas', sortOrder: 10 },
    { id: 'cat-2', slug: 'cat-2', name: 'Snacks', sortOrder: 20 }
  ],
  promotions: [
    {
      code: 'BIENVENIDA10',
      type: 'PERCENTAGE',
      value: 10,
      shortLabel: 'BIENVENIDA10 · 10% OFF',
      expirationDate: '2026-04-01T12:00:00.000Z'
    }
  ]
}

function productsPage(content: unknown[], page = 0, size = 20, totalElements = content.length, totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size)) {
  return {
    content,
    page,
    size,
    totalElements,
    totalPages
  }
}

describe('public store catalog discovery', () => {
  beforeEach(() => {
    clearStorage()
    document.body.innerHTML = ''
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: undefined
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('filters products by search query', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const q = parsed.searchParams.get('q')?.toLowerCase() ?? ''
        const catalog = [
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 800, id: 'p2', slug: 'p2', name: 'Te verde', sku: 'SKU-TE', stockQuantity: 2, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]
        return {
          body: productsPage(q ? catalog.filter((product) => product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)) : catalog)
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Promociones activas para esta store')
    expect(document.body.textContent).toContain('BIENVENIDA10')
    expect(document.body.textContent).toContain('Sobre esta tienda')
    expect(document.body.textContent).toContain('Cafetería de especialidad con desayunos y atención de barrio.')
    expect(document.body.textContent).toContain('Contacto')
    expect(document.body.textContent).toContain('hola@demo.test')
    expect(document.querySelector('[data-appearance="local-business"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Contactar')

    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement
    await setInputElementValue(searchInput, 'cafe')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cafe molido')
    expect(document.body.textContent).not.toContain('Te verde')
    expect(handler.mock.calls.some(([url]) => String(url).includes('q=cafe'))).toBe(true)

    await cleanup()
  })

  it('shows public profile sections only when ABOUT and CONTACT are enabled', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          ...storeResponse,
          capabilities: ['ABOUT', 'CONTACT'],
          categories: [],
          promotions: []
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Sobre esta tienda')
    expect(document.body.textContent).toContain('Cafetería de especialidad con desayunos y atención de barrio.')
    expect(document.body.textContent).toContain('Contacto')
    expect(document.body.textContent).toContain('221 555 0101')
    expect(document.body.textContent).toContain('+54 9 221 555 0101')
    expect(document.body.textContent).not.toContain('Productos')

    await cleanup()
  })

  it('uses MODERN fallback when appearance is missing', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          ...storeResponse,
          appearance: undefined,
          promotions: []
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.querySelector('[data-appearance="modern"]')).toBeTruthy()

    await cleanup()
  })

  it('applies portfolio appearance without hiding catalog', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          ...storeResponse,
          appearance: 'PORTFOLIO',
          promotions: []
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.querySelector('[data-appearance="portfolio"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Sobre esta tienda')
    expect(document.body.textContent).toContain('Productos')
    expect(document.body.textContent).toContain('Cafe molido')

    await cleanup()
  })

  it('hides ABOUT and CONTACT profile sections when capabilities are disabled', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          ...storeResponse,
          capabilities: ['PRODUCTS'],
          categories: [],
          promotions: []
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).not.toContain('Sobre esta tienda')
    expect(document.body.textContent).not.toContain('Cafetería de especialidad con desayunos y atención de barrio.')
    expect(document.body.textContent).not.toContain('Contacto')
    expect(document.body.textContent).not.toContain('hola@demo.test')

    await cleanup()
  })

  it('does not render or request catalog when PRODUCTS is disabled', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          ...storeResponse,
          capabilities: ['ABOUT', 'CONTACT'],
          categories: [],
          promotions: []
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Esta tienda no muestra productos')
    expect(document.body.textContent).not.toContain('Cafe molido')
    expect(document.querySelector('input[aria-label="Buscar productos"]')).toBeNull()
    expect(handler.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/api/public/stores/demo-store/products'))).toHaveLength(0)

    await cleanup()
  })

  it('hides cart and checkout actions when CHECKOUT is disabled', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          ...storeResponse,
          capabilities: ['ABOUT', 'PRODUCTS', 'PROMOTIONS', 'SHIPPING', 'CONTACT']
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cafe molido')
    expect(document.body.textContent).not.toContain('Carrito de Demo Store')
    expect(document.body.textContent).not.toContain('Ir al checkout de la tienda')
    expect(document.body.textContent).not.toContain('Agregar')
    expect(Array.from(document.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/checkout')).toBe(false)

    await cleanup()
  })

  it('tracks product list views once and keeps existing public store events', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'cafe-molido', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 800, id: 'p2', slug: 'te-verde', name: 'Te verde', sku: 'SKU-TE', stockQuantity: 2, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()
    await flush()

    const events = telemetryEvents(handler)
    const listEvents = events.filter((event) => event.eventName === 'public_product_list_viewed')
    expect(listEvents).toHaveLength(1)
    expect(listEvents[0]).toMatchObject({
      storeSlug: 'demo-store',
      metadata: {
        resultCount: '2',
        hasQuery: 'false',
        categorySelected: 'false',
        page: '0',
        surface: 'public_store_catalog'
      }
    })
    expect(events.filter((event) => event.eventName === 'store_view')).toHaveLength(1)
    expect(JSON.stringify(listEvents[0])).not.toContain('p1')
    expect(JSON.stringify(listEvents[0])).not.toContain('SKU-CAFE')

    await cleanup()
  })

  it('loads filters from URL and requests products with those filters', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const q = parsed.searchParams.get('q')?.toLowerCase() ?? ''
        const availableOnly = parsed.searchParams.get('availableOnly') === 'true'
        const sort = parsed.searchParams.get('sort')
        const categoryId = parsed.searchParams.get('categoryId')
        const catalog = [
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 700, id: 'p2', slug: 'p2', name: 'Papas', sku: 'SKU-PAPAS', stockQuantity: 0, isAvailable: false, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]
        return {
          body: productsPage(catalog.filter((product) => {
            const matchesQuery = q ? product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q) : true
            const matchesAvailability = availableOnly ? product.isAvailable : true
            const matchesCategory = categoryId ? product.categoryId === categoryId : true
            return matchesQuery && matchesAvailability && matchesCategory
          }).sort((a, b) => sort === 'price,desc' ? b.priceCents - a.priceCents : 0))
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store?q=cafe&availableOnly=true&sort=price,desc&categoryId=cat-1')
    await flush()
    await flush()

    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement
    const availableOnlyInput = document.querySelector('input[aria-label="Solo disponibles"]') as HTMLInputElement
    const sortSelect = document.querySelector('select[aria-label="Ordenar productos"]') as HTMLSelectElement
    const categorySelect = document.querySelector('select[aria-label="Filtrar por categoría"]') as HTMLSelectElement

    expect(searchInput.value).toBe('cafe')
    expect(availableOnlyInput.checked).toBe(true)
    expect(sortSelect.value).toBe('price,desc')
    expect(categorySelect.value).toBe('cat-1')
    expect(document.body.textContent).toContain('Cafe molido')
    expect(document.body.textContent).not.toContain('Papas')

    const productUrls = handler.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/api/public/stores/demo-store/products'))
    expect(productUrls.some((url) => {
      const parsed = new URL(url, 'http://localhost')
      return parsed.searchParams.get('q') === 'cafe' &&
        parsed.searchParams.get('availableOnly') === 'true' &&
        parsed.searchParams.get('sort') === 'price,desc' &&
        parsed.searchParams.get('categoryId') === 'cat-1' &&
        parsed.searchParams.get('page') === '0' &&
        parsed.searchParams.get('size') === '20'
    })).toBe(true)

    await cleanup()
  })

  it('loads page from URL and requests the matching products page', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        const content = page === 2
          ? [{ priceCents: 1000, id: 'p3', slug: 'p3', name: 'Pagina tres', sku: 'SKU-P3', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }]
          : []
        return { body: productsPage(content, page, 20, 41, 3) }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store?page=2')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Pagina tres')
    expect(document.body.textContent).toContain('Página 3 de 3')
    const nextButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Siguiente')) as HTMLButtonElement
    expect(nextButton.disabled).toBe(true)
    expect(handler.mock.calls.some(([url]) => {
      const parsed = new URL(String(url), 'http://localhost')
      return parsed.searchParams.get('page') === '2' && parsed.searchParams.get('size') === '20'
    })).toBe(true)

    await cleanup()
  })

  it.each(['abc', '-1'])('normalizes invalid page URL value %s to the first page', async (pageParam) => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return {
          body: productsPage([
            { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Primera pagina', sku: 'SKU-P1', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
          ], page, 20, 20, 1)
        }
      }
    })

    const { cleanup } = await renderAppAt(`/public/demo-store?page=${pageParam}`)
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
    expect(document.body.textContent).toContain('Primera pagina')
    expect(handler.mock.calls.some(([url]) => {
      const parsed = new URL(String(url), 'http://localhost')
      return parsed.pathname === '/api/public/stores/demo-store/products' &&
        parsed.searchParams.get('page') === '0' &&
        parsed.searchParams.get('size') === '20'
    })).toBe(true)

    await cleanup()
  })

  it('changes page through pagination controls and keeps page zero out of the URL', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return {
          body: productsPage([
            { priceCents: 1000 + page, id: `p${page}`, slug: `p${page}`, name: `Producto pagina ${page + 1}`, sku: `SKU-P${page}`, stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
          ], page, 20, 40, 2)
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
    const nextButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Siguiente')) as HTMLButtonElement
    const initialPreviousButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Anterior')) as HTMLButtonElement
    expect(initialPreviousButton.disabled).toBe(true)
    await clickElement(nextButton)
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('page')).toBe('1')
    expect(document.body.textContent).toContain('Página 2 de 2')
    expect(handler.mock.calls.some(([url]) => {
      const parsed = new URL(String(url), 'http://localhost')
      return parsed.searchParams.get('page') === '1'
    })).toBe(true)
    expect(handler.mock.calls.map(([url]) => String(url)).filter((url) => url === '/api/public/stores/demo-store')).toHaveLength(1)

    const previousButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Anterior')) as HTMLButtonElement
    await clickElement(previousButton)
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
    expect(document.body.textContent).toContain('Página 1 de 2')

    await cleanup()
  })

  it('keeps cart quantity controls usable for items from another products page', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return {
          body: productsPage([
            { priceCents: 1000 + page, id: `p${page}`, slug: `p${page}`, name: `Producto pagina ${page + 1}`, sku: `SKU-P${page}`, stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
          ], page, 20, 40, 2)
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const addButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Agregar') as HTMLButtonElement
    await clickElement(addButton)
    await flush()

    const nextButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Siguiente')) as HTMLButtonElement
    await clickElement(nextButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Producto pagina 1')
    expect(document.body.textContent).toContain('Producto pagina 2')
    const increaseButton = document.querySelector('button[aria-label="Aumentar cantidad"]') as HTMLButtonElement
    expect(increaseButton.disabled).toBe(false)
    await clickElement(increaseButton)
    await flush()

    expect(document.body.textContent).toContain('2 x')

    await cleanup()
  })

  it('keeps store metadata cached when changing product pages', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return {
          body: productsPage([
            { priceCents: 1000 + page, id: `p${page}`, slug: `p${page}`, name: `Producto pagina ${page + 1}`, sku: `SKU-P${page}`, stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
          ], page, 20, 40, 2)
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const nextButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Siguiente')) as HTMLButtonElement
    await clickElement(nextButton)
    await flush()
    await flush()

    const urls = handler.mock.calls.map(([url]) => String(url))
    expect(urls.filter((url) => url === '/api/public/stores/demo-store')).toHaveLength(1)
    expect(urls.some((url) => {
      const parsed = new URL(url, 'http://localhost')
      return parsed.pathname === '/api/public/stores/demo-store/products' &&
        parsed.searchParams.get('page') === '1' &&
        parsed.searchParams.get('size') === '20'
    })).toBe(true)

    await cleanup()
  })

  it('resets page to zero when filters change', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return {
          body: productsPage([
            { priceCents: 1000, id: `p${page}`, slug: `p${page}`, name: `Producto pagina ${page + 1}`, sku: `SKU-P${page}`, stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
          ], page, 20, 60, 3)
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store?page=2')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('page')).toBe('2')
    const sortSelect = document.querySelector('select[aria-label="Ordenar productos"]') as HTMLSelectElement
    await setSelectElementValue(sortSelect, 'price,asc')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
    expect(new URLSearchParams(window.location.search).get('sort')).toBe('price,asc')
    expect(document.body.textContent).toContain('Página 1 de 3')

    await cleanup()
  })

  it('restores page with browser back and forward', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return {
          body: productsPage([
            { priceCents: 1000, id: `p${page}`, slug: `p${page}`, name: `Producto pagina ${page + 1}`, sku: `SKU-P${page}`, stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
          ], page, 20, 40, 2)
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const nextButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Siguiente')) as HTMLButtonElement
    await clickElement(nextButton)
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('page')).toBe('1')

    window.history.back()
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
    expect(document.body.textContent).toContain('Página 1 de 2')

    window.history.forward()
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('page')).toBe('1')
    expect(document.body.textContent).toContain('Página 2 de 2')

    await cleanup()
  })

  it('updates and removes the q URL parameter when search changes', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': { body: productsPage([]) }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement
    await setInputElementValue(searchInput, 'cafe')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('q')).toBe('cafe')

    await setInputElementValue(searchInput, '')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('q')).toBe(false)

    await cleanup()
  })

  it('writes q URL changes with replace so typing does not add history entries', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': { body: productsPage([]) }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const pushStateSpy = vi.spyOn(window.history, 'pushState')
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement

    await setInputElementValue(searchInput, 'ca')
    await flush()
    await flush()
    await setInputElementValue(searchInput, 'cafe')
    await flush()
    await flush()
    await setInputElementValue(searchInput, '')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('q')).toBe(false)
    expect(replaceStateSpy).toHaveBeenCalled()
    expect(pushStateSpy).not.toHaveBeenCalled()

    await cleanup()
  })

  it('adds and removes the availableOnly URL parameter when availability changes', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': { body: productsPage([]) }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const checkbox = document.querySelector('input[aria-label="Solo disponibles"]') as HTMLInputElement
    await clickElement(checkbox)
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('availableOnly')).toBe('true')

    await clickElement(checkbox)
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('availableOnly')).toBe(false)

    await cleanup()
  })

  it('adds and removes sort and categoryId URL parameters when filters change', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': { body: productsPage([]) }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const sortSelect = document.querySelector('select[aria-label="Ordenar productos"]') as HTMLSelectElement
    await setSelectElementValue(sortSelect, 'price,asc')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('sort')).toBe('price,asc')

    await setSelectElementValue(sortSelect, 'default')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('sort')).toBe(false)

    const categorySelect = document.querySelector('select[aria-label="Filtrar por categoría"]') as HTMLSelectElement
    await setSelectElementValue(categorySelect, 'cat-2')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('categoryId')).toBe('cat-2')

    await setSelectElementValue(categorySelect, '')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).has('categoryId')).toBe(false)

    await cleanup()
  })

  it('writes discrete filter URL changes with normal history navigation', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': { body: productsPage([]) }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const pushStateSpy = vi.spyOn(window.history, 'pushState')
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    const checkbox = document.querySelector('input[aria-label="Solo disponibles"]') as HTMLInputElement
    const sortSelect = document.querySelector('select[aria-label="Ordenar productos"]') as HTMLSelectElement

    await clickElement(checkbox)
    await flush()
    await flush()
    await setSelectElementValue(sortSelect, 'price,asc')
    await flush()
    await flush()

    expect(new URLSearchParams(window.location.search).get('availableOnly')).toBe('true')
    expect(new URLSearchParams(window.location.search).get('sort')).toBe('price,asc')
    expect(pushStateSpy).toHaveBeenCalled()
    expect(replaceStateSpy).not.toHaveBeenCalled()

    await cleanup()
  })

  it('restores discrete URL-backed filters with browser back and forward', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': { body: productsPage([]) }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const checkbox = document.querySelector('input[aria-label="Solo disponibles"]') as HTMLInputElement
    const sortSelect = document.querySelector('select[aria-label="Ordenar productos"]') as HTMLSelectElement
    await clickElement(checkbox)
    await flush()
    await flush()
    await setSelectElementValue(sortSelect, 'price,asc')
    await flush()
    await flush()

    expect(checkbox.checked).toBe(true)
    expect(sortSelect.value).toBe('price,asc')

    window.history.back()
    await flush()
    await flush()

    expect(checkbox.checked).toBe(true)
    expect(sortSelect.value).toBe('default')
    expect(new URLSearchParams(window.location.search).get('availableOnly')).toBe('true')
    expect(new URLSearchParams(window.location.search).has('sort')).toBe(false)

    window.history.forward()
    await flush()
    await flush()

    expect(checkbox.checked).toBe(true)
    expect(sortSelect.value).toBe('price,asc')
    expect(new URLSearchParams(window.location.search).get('availableOnly')).toBe('true')
    expect(new URLSearchParams(window.location.search).get('sort')).toBe('price,asc')

    await cleanup()
  })

  it('does not refetch store metadata when product filters change', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const q = parsed.searchParams.get('q')?.toLowerCase() ?? ''
        const categoryId = parsed.searchParams.get('categoryId')
        const catalog = [
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 700, id: 'p2', slug: 'p2', name: 'Papas', sku: 'SKU-PAPAS', stockQuantity: 3, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]
        return {
          body: productsPage(catalog.filter((product) => {
            const matchesQuery = q ? product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q) : true
            const matchesCategory = categoryId ? product.categoryId === categoryId : true
            return matchesQuery && matchesCategory
          }))
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement
    await setInputElementValue(searchInput, 'cafe')
    await flush()
    await flush()

    const categorySelect = document.querySelector('select[aria-label="Filtrar por categoría"]') as HTMLSelectElement
    await setSelectElementValue(categorySelect, 'cat-1')
    await flush()
    await flush()

    const urls = handler.mock.calls.map(([url]) => String(url))
    expect(urls.filter((url) => url === '/api/public/stores/demo-store')).toHaveLength(1)
    expect(urls.some((url) => url.includes('/api/public/stores/demo-store/products') && url.includes('q=cafe'))).toBe(true)
    expect(urls.some((url) => url.includes('/api/public/stores/demo-store/products') && url.includes('categoryId=cat-1'))).toBe(true)

    await cleanup()
  })

  it('keeps the current catalog visible while filters refetch', async () => {
    let resolveFilteredProducts: () => void = () => undefined
    const filteredProductsReady = new Promise<void>((resolve) => {
      resolveFilteredProducts = resolve
    })

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('/api/public/stores/demo-store/products')) {
        const parsed = new URL(url, 'http://localhost')
        if (parsed.searchParams.get('q') === 'cafe') {
          await filteredProductsReady
          return new Response(JSON.stringify(productsPage([
            { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' }
          ])), { status: 200 })
        }
        return new Response(JSON.stringify(productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 800, id: 'p2', slug: 'p2', name: 'Te verde', sku: 'SKU-TE', stockQuantity: 2, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ])), { status: 200 })
      }
      if (url.startsWith('/api/public/stores/demo-store')) {
        return new Response(JSON.stringify(storeResponse), { status: 200 })
      }
      return new Response('', { status: 404 })
    }) as unknown as typeof fetch

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cafe molido')
    expect(document.body.textContent).toContain('Te verde')

    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement
    await setInputElementValue(searchInput, 'cafe')
    await flush()

    expect(document.body.textContent).toContain('Actualizando catálogo')
    expect(document.body.textContent).toContain('Te verde')
    expect(document.body.textContent).not.toContain('Cargando store')

    resolveFilteredProducts()
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cafe molido')
    expect(document.body.textContent).not.toContain('Te verde')

    await cleanup()
  })

  it('toggles availableOnly and keeps unavailable products clearly marked otherwise', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const availableOnly = parsed.searchParams.get('availableOnly') === 'true'
        const catalog = [
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Disponible', sku: 'SKU-ON', stockQuantity: 3, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 900, id: 'p2', slug: 'p2', name: 'Sin stock', sku: 'SKU-OFF', stockQuantity: 0, isAvailable: false, categoryId: null, categoryName: null }
        ]
        return { body: productsPage(availableOnly ? catalog.filter((product) => product.isAvailable) : catalog) }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Sin stock disponible')
    expect(document.body.textContent).toContain('Se mantiene visible para referencia')

    const unavailableButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Sin stock')) as HTMLButtonElement
    expect(unavailableButton.disabled).toBe(true)

    const checkbox = document.querySelector('input[aria-label="Solo disponibles"]') as HTMLInputElement
    await clickElement(checkbox)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Disponible ahora')
    expect(document.body.textContent).not.toContain('Sin stockSKU: SKU-OFF')

    await cleanup()
  })

  it('changes ordering with the sort control', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const sort = parsed.searchParams.get('sort')
        const catalog = [
          { priceCents: 1200, id: 'p1', slug: 'p1', name: 'Beta', sku: 'SKU-B', stockQuantity: 1, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 800, id: 'p2', slug: 'p2', name: 'Alpha', sku: 'SKU-A', stockQuantity: 1, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]

        if (sort === 'price,asc') {
          return { body: productsPage([...catalog].sort((a, b) => a.priceCents - b.priceCents)) }
        }

        return { body: productsPage(catalog) }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const sortSelect = document.querySelector('select[aria-label="Ordenar productos"]') as HTMLSelectElement
    await setSelectElementValue(sortSelect, 'price,asc')
    await flush()
    await flush()

    const names = Array.from(document.querySelectorAll('div'))
      .map((element) => element.textContent?.trim())
      .filter((text): text is string => text === 'Alpha' || text === 'Beta')
    expect(names.slice(0, 2)).toEqual(['Alpha', 'Beta'])

    await cleanup()
  })

  it('shows an empty state when no products match the filters', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const q = parsed.searchParams.get('q')
        if (q === 'no-existe') return { body: productsPage([]) }
        return {
          body: productsPage([
            { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' }
          ])
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement
    await setInputElementValue(searchInput, 'no-existe')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No hay productos para esos filtros')

    await cleanup()
  })

  it('shows a specific out-of-range state and returns to the first page preserving filters', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        const content = page === 0
          ? [{ priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe filtrado', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' }]
          : []
        return { body: productsPage(content, page, 20, 1, 1) }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store?q=cafe&availableOnly=true&sort=price,asc&categoryId=cat-1&page=5')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Esta página no tiene productos')
    expect(document.body.textContent).toContain('Volver a la primera página')
    expect(document.body.textContent).toContain('Página 1 de 1')
    const previousButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Anterior')) as HTMLButtonElement
    const nextButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Siguiente')) as HTMLButtonElement
    expect(previousButton.disabled).toBe(false)
    expect(nextButton.disabled).toBe(true)

    const resetButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Volver a la primera página')) as HTMLButtonElement
    await clickElement(resetButton)
    await flush()
    await flush()

    const params = new URLSearchParams(window.location.search)
    expect(params.has('page')).toBe(false)
    expect(params.get('q')).toBe('cafe')
    expect(params.get('availableOnly')).toBe('true')
    expect(params.get('sort')).toBe('price,asc')
    expect(params.get('categoryId')).toBe('cat-1')
    expect(document.body.textContent).toContain('Cafe filtrado')
    expect(handler.mock.calls.map(([url]) => String(url)).filter((url) => url === '/api/public/stores/demo-store')).toHaveLength(1)

    await cleanup()
  })

  it('keeps the normal empty state for truly empty filtered results with totalElements zero', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return { body: productsPage([], page, 20, 0, 0) }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store?q=no-existe&page=3')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No hay productos para esos filtros')
    expect(document.body.textContent).not.toContain('Esta página no tiene productos')
    expect(document.body.textContent).toContain('Página 1 de 1')

    await cleanup()
  })

  it('shows the existing error state when public products fail to load', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': {
        status: 400,
        body: {
          error: {
            code: 'catalog_unavailable',
            message: 'No pudimos cargar productos',
            status: 400
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No pudimos cargar productos')
    expect(document.body.textContent).toContain('Reintentar')

    await cleanup()
  })

  it('shows the store error when public store metadata fails to load', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        status: 400,
        body: {
          error: {
            code: 'store_unavailable',
            message: 'No pudimos cargar la tienda',
            status: 400
          }
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No pudimos cargar la tienda')
    expect(document.body.textContent).toContain('Reintentar')
    expect(document.body.textContent).not.toContain('Cafe')

    await cleanup()
  })

  it('retries store metadata and products when the retry action is clicked', async () => {
    let storeCalls = 0
    let productCalls = 0
    mockFetch({
      '/api/public/stores/demo-store': () => {
        storeCalls += 1
        if (storeCalls === 1) {
          return {
            status: 400,
            body: {
              error: {
                code: 'store_unavailable',
                message: 'No pudimos cargar la tienda',
                status: 400
              }
            }
          }
        }
        return { body: storeResponse }
      },
      '/api/public/stores/demo-store/products': () => {
        productCalls += 1
        return {
          body: productsPage([
            { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
          ])
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No pudimos cargar la tienda')
    expect(storeCalls).toBe(1)
    expect(productCalls).toBe(0)

    const retryButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Reintentar'))
    expect(retryButton).toBeTruthy()
    await clickElement(retryButton)
    await flush()
    await flush()

    expect(storeCalls).toBe(2)
    expect(productCalls).toBe(1)
    expect(document.body.textContent).toContain('Cafe')
    expect(document.body.textContent).not.toContain('No pudimos cargar la tienda')

    await cleanup()
  })

  it('does not show inactive promotions when the public store has none visible', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          slug: 'demo-store',
          id: 's1',
          name: 'Demo Store',
          categories: [],
          promotions: []
        }
      },
      '/api/public/stores/demo-store/products': {
        body: productsPage([
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ])
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).not.toContain('Promociones activas para esta store')

    await cleanup()
  })

  it('filters products by category', async () => {
    const handler = mockFetch({
      '/api/public/stores/demo-store': { body: storeResponse },
      '/api/public/stores/demo-store/products': (url) => {
        const parsed = new URL(url, 'http://localhost')
        const categoryId = parsed.searchParams.get('categoryId')
        const catalog = [
          { priceCents: 1000, id: 'p1', slug: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 700, id: 'p2', slug: 'p2', name: 'Papas', sku: 'SKU-PAPAS', stockQuantity: 3, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]
        return {
          body: productsPage(categoryId ? catalog.filter((product) => product.categoryId === categoryId) : catalog)
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    const categorySelect = document.querySelector('select[aria-label="Filtrar por categoría"]') as HTMLSelectElement
    await setSelectElementValue(categorySelect, 'cat-2')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Papas')
    expect(document.body.textContent).not.toContain('Cafe molido')
    expect(handler.mock.calls.some(([url]) => String(url).includes('categoryId=cat-2'))).toBe(true)

    await cleanup()
  })
})
