import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicEcosystemAdapter } from '../publicEcosystemAdapter'

const products = [
  {
    id: 'ext-1',
    name: 'External Apple',
    priceAmount: 150,
    currency: 'ARS',
    deliverySupported: true
  }
]

function mockPublicEcosystemProductsFetch(body: unknown) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status: 200 }))
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

describe('publicEcosystemAdapter products', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests paginated ecosystem products with page and size', async () => {
    const fetchMock = mockPublicEcosystemProductsFetch({
      content: products,
      page: 2,
      size: 24,
      totalElements: 57,
      totalPages: 3
    })

    const result = await publicEcosystemAdapter.listProducts('demo-ecosystem', {
      page: 2,
      size: 24
    })

    expect(result.page).toBe(2)
    expect(result.size).toBe(24)
    expect(result.totalElements).toBe(57)
    expect(result.content).toHaveLength(1)
    const parsed = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(parsed.searchParams.get('activeOnly')).toBe('true')
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.get('size')).toBe('24')
  })

  it('preserves ecosystem product filters while paging', async () => {
    const fetchMock = mockPublicEcosystemProductsFetch({
      content: products,
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1
    })

    await publicEcosystemAdapter.listProducts('demo-ecosystem', {
      query: ' apple ',
      sort: 'price,asc',
      deliverySupported: true,
      activeOnly: true,
      page: 0,
      size: 12
    })

    const parsed = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(parsed.searchParams.get('q')).toBe('apple')
    expect(parsed.searchParams.get('sort')).toBe('price,asc')
    expect(parsed.searchParams.get('deliverySupported')).toBe('true')
    expect(parsed.searchParams.get('page')).toBe('0')
    expect(parsed.searchParams.get('size')).toBe('12')
  })

  it('sends relevance sort when requested', async () => {
    const fetchMock = mockPublicEcosystemProductsFetch({
      content: products,
      page: 0,
      size: 24,
      totalElements: 1,
      totalPages: 1
    })

    await publicEcosystemAdapter.listProducts('demo-ecosystem', {
      query: 'apple',
      sort: 'relevance'
    })

    const parsed = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(parsed.searchParams.get('q')).toBe('apple')
    expect(parsed.searchParams.get('sort')).toBe('relevance')
  })

  it('omits default sort when no explicit ecosystem product sort is requested', async () => {
    const fetchMock = mockPublicEcosystemProductsFetch({
      content: products,
      page: 0,
      size: 24,
      totalElements: 1,
      totalPages: 1
    })

    await publicEcosystemAdapter.listProducts('demo-ecosystem', {
      query: 'apple',
      sort: 'default'
    })

    const parsed = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(parsed.searchParams.get('q')).toBe('apple')
    expect(parsed.searchParams.has('sort')).toBe(false)
  })

  it('normalizes legacy array payloads to a products page', async () => {
    mockPublicEcosystemProductsFetch(products)

    const result = await publicEcosystemAdapter.listProducts('demo-ecosystem')

    expect(result.content).toHaveLength(1)
    expect(result.page).toBe(0)
    expect(result.totalElements).toBe(1)
    expect(result.totalPages).toBe(1)
  })
})
