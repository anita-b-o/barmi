import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicAdapter } from '../publicAdapter'

const products = [
  { priceCents: 15000, id: '22222222-2222-2222-2222-222222222222', slug: 'apple', name: 'Apple', sku: 'SKU-APPLE', stockQuantity: 8, isAvailable: true, categoryId: '66666666-6666-6666-6666-666666666666', categoryName: 'Bebidas' }
]

function mockPublicProductsFetch(body: unknown) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status: 200 }))
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

describe('publicAdapter public store products', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the legacy products method array-only and does not send pagination params', async () => {
    const fetchMock = mockPublicProductsFetch(products)

    const result = await publicAdapter.getProducts('demo-store', {
      q: ' apple ',
      availableOnly: true,
      sort: 'price,asc',
      categoryId: 'cat-1'
    })

    expect(result).toHaveLength(1)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/public/stores/demo-store/products?')
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.searchParams.get('q')).toBe('apple')
    expect(parsed.searchParams.get('availableOnly')).toBe('true')
    expect(parsed.searchParams.get('sort')).toBe('price,asc')
    expect(parsed.searchParams.get('categoryId')).toBe('cat-1')
    expect(parsed.searchParams.has('page')).toBe(false)
    expect(parsed.searchParams.has('size')).toBe(false)
  })

  it('requests paginated products with page and size', async () => {
    const fetchMock = mockPublicProductsFetch({
      content: products,
      page: 2,
      size: 25,
      totalElements: 76,
      totalPages: 4
    })

    const result = await publicAdapter.getProductsPage('demo-store', {}, 2, 25)

    expect(result.page).toBe(2)
    expect(result.size).toBe(25)
    expect(result.totalElements).toBe(76)
    expect(result.content).toHaveLength(1)
    const parsed = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.get('size')).toBe('25')
  })

  it('preserves existing filters when requesting paginated products', async () => {
    const fetchMock = mockPublicProductsFetch({
      content: products,
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1
    })

    await publicAdapter.getProductsPage('demo-store', {
      q: ' apple ',
      availableOnly: true,
      sort: 'name,desc',
      categoryId: 'cat-2'
    }, 0, 20)

    const parsed = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(parsed.searchParams.get('q')).toBe('apple')
    expect(parsed.searchParams.get('availableOnly')).toBe('true')
    expect(parsed.searchParams.get('sort')).toBe('name,desc')
    expect(parsed.searchParams.get('categoryId')).toBe('cat-2')
    expect(parsed.searchParams.get('page')).toBe('0')
    expect(parsed.searchParams.get('size')).toBe('20')
  })

  it('requests public product detail by store slug and product slug', async () => {
    const fetchMock = mockPublicProductsFetch({
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
    })

    const result = await publicAdapter.getProductDetail('demo-store', 'pan-de-campo')

    expect(result.product.slug).toBe('pan-de-campo')
    expect(fetchMock).toHaveBeenCalledWith('/api/public/stores/demo-store/products/pan-de-campo', expect.anything())
  })
})
