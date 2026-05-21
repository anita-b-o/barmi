import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setInputElementValue, setSelectElementValue } from '../test-utils/testUtils'

const storeResponse = {
  slug: 'demo-store',
  id: 's1',
  name: 'Demo Store',
  categories: [
    { id: 'cat-1', name: 'Bebidas', sortOrder: 10 },
    { id: 'cat-2', name: 'Snacks', sortOrder: 20 }
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

describe('public store catalog discovery', () => {
  beforeEach(() => {
    clearStorage()
    document.body.innerHTML = ''
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
          { priceCents: 1000, id: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 800, id: 'p2', name: 'Te verde', sku: 'SKU-TE', stockQuantity: 2, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]
        return {
          body: q ? catalog.filter((product) => product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)) : catalog
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Promociones activas para esta store')
    expect(document.body.textContent).toContain('BIENVENIDA10')

    const searchInput = document.querySelector('input[aria-label="Buscar productos"]') as HTMLInputElement
    await setInputElementValue(searchInput, 'cafe')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cafe molido')
    expect(document.body.textContent).not.toContain('Te verde')
    expect(handler.mock.calls.some(([url]) => String(url).includes('q=cafe'))).toBe(true)

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
          return new Response(JSON.stringify([
            { priceCents: 1000, id: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' }
          ]), { status: 200 })
        }
        return new Response(JSON.stringify([
          { priceCents: 1000, id: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 800, id: 'p2', name: 'Te verde', sku: 'SKU-TE', stockQuantity: 2, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]), { status: 200 })
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
          { priceCents: 1000, id: 'p1', name: 'Disponible', sku: 'SKU-ON', stockQuantity: 3, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 900, id: 'p2', name: 'Sin stock', sku: 'SKU-OFF', stockQuantity: 0, isAvailable: false, categoryId: null, categoryName: null }
        ]
        return { body: availableOnly ? catalog.filter((product) => product.isAvailable) : catalog }
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
          { priceCents: 1200, id: 'p1', name: 'Beta', sku: 'SKU-B', stockQuantity: 1, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 800, id: 'p2', name: 'Alpha', sku: 'SKU-A', stockQuantity: 1, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]

        if (sort === 'price,asc') {
          return { body: [...catalog].sort((a, b) => a.priceCents - b.priceCents) }
        }

        return { body: catalog }
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
        if (q === 'no-existe') return { body: [] }
        return {
          body: [
            { priceCents: 1000, id: 'p1', name: 'Cafe', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' }
          ]
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
        body: [
          { priceCents: 1000, id: 'p1', name: 'Cafe', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: null, categoryName: null }
        ]
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
          { priceCents: 1000, id: 'p1', name: 'Cafe molido', sku: 'SKU-CAFE', stockQuantity: 5, isAvailable: true, categoryId: 'cat-1', categoryName: 'Bebidas' },
          { priceCents: 700, id: 'p2', name: 'Papas', sku: 'SKU-PAPAS', stockQuantity: 3, isAvailable: true, categoryId: 'cat-2', categoryName: 'Snacks' }
        ]
        return {
          body: categoryId ? catalog.filter((product) => product.categoryId === categoryId) : catalog
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
