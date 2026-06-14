import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setInputElementValue, setSelectElementValue, clickElement, waitForMs } from '../test-utils/testUtils'

const ecosystemResponse = {
  id: 'eco-1',
  slug: 'demo-ecosystem',
  name: 'Demo Ecosystem',
  promotions: [
    {
      code: 'BIENVENIDA10',
      type: 'PERCENTAGE',
      value: 10,
      shortLabel: 'BIENVENIDA10 · 10% OFF',
      expirationDate: '2026-12-31T23:59:59Z'
    }
  ]
}

const ecosystemProductsResponse = [
  {
    id: 'ext-1',
    name: 'External Apple',
    priceAmount: 150,
    currency: 'ARS',
    deliverySupported: true
  },
  {
    id: 'ext-2',
    name: 'External Banana',
    priceAmount: 120,
    currency: 'ARS',
    deliverySupported: false
  }
]

function ecosystemProductsPage(content = ecosystemProductsResponse, page = 0, size = 24, totalElements = content.length) {
  return {
    content,
    page,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size)
  }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ecosystem catalog', () => {
  it('renders public ecosystem catalog with backend products', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': { body: ecosystemProductsPage(ecosystemProductsResponse, 0, 24, 2) },
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Demo Ecosystem')
    expect(document.body.textContent).toContain('Promociones disponibles')
    expect(document.body.textContent).toContain('BIENVENIDA10 · 10% OFF')
    expect(document.body.textContent).toContain('External Apple')
    expect(document.body.textContent).toContain('Entrega disponible')
    expect(document.body.textContent).toContain('Sin entrega')
    expect(document.body.textContent).toContain('Página 1 de 1')
    expect(document.body.textContent).not.toContain('Carrito Ecosystem')

    await cleanup()
  })

  it('hides promotions block when there are no visible promotions', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: { ...ecosystemResponse, promotions: [] } },
      '/api/public/ecosystems/demo-ecosystem/products': { body: ecosystemProductsPage(ecosystemProductsResponse, 0, 24, 2) },
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog')
    await flush()
    await flush()

    expect(document.body.textContent).not.toContain('Promociones disponibles')

    await cleanup()
  })

  it('shows empty state when search returns no products', async () => {
    const fetchMock = mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': (url: string) => ({
        body: url.includes('q=pear') ? [] : ecosystemProductsResponse
      }),
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup, container } = await renderAppAt('/ecosystem/catalog')
    await flush()
    await flush()

    const input = container.querySelector('input[aria-label="Buscar productos ecosystem"]')
    expect(input).not.toBeNull()
    await setInputElementValue(input as HTMLInputElement, 'pear')

    await flush()
    await flush()

    expect(fetchMock).toHaveBeenCalled()
    expect(document.body.textContent).toContain('No hay productos para esos filtros')

    await cleanup()
  })

  it('supports sort and delivery filter in the public ecosystem catalog', async () => {
    const fetchMock = mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': (url: string) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        const size = Number(parsed.searchParams.get('size') ?? '24')
        const sort = parsed.searchParams.get('sort')
        const deliverySupported = parsed.searchParams.get('deliverySupported')
        let catalog = [...ecosystemProductsResponse]
        if (deliverySupported === 'true') {
          catalog = catalog.filter((product) => product.deliverySupported)
        }
        if (sort === 'price,asc') {
          catalog = [...catalog].sort((a, b) => a.priceAmount - b.priceAmount)
        }
        return { body: ecosystemProductsPage(catalog, page, size, catalog.length) }
      },
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog')
    await flush()
    await flush()

    const sortSelect = document.querySelector('select[aria-label="Ordenar productos ecosystem"]') as HTMLSelectElement
    await setSelectElementValue(sortSelect, 'price,asc')
    await flush()
    await flush()

    const deliveryCheckbox = document.querySelector('input[aria-label="Solo con entrega"]') as HTMLInputElement
    await clickElement(deliveryCheckbox)
    await flush()
    await flush()

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('sort=price%2Casc'))).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('deliverySupported=true'))).toBe(true)
    expect(document.body.textContent).toContain('External Apple')
    expect(document.body.textContent).not.toContain('External Banana')

    await cleanup()
  })

  it('cleans empty/default catalog URL params while preserving unrelated params', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': { body: ecosystemProductsPage(ecosystemProductsResponse, 0, 24, 2) },
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog?q=External&sort=price%2Casc&deliverySupported=true&utm=keep')
    await flush()
    await flush()

    const clearButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Limpiar filtros')
    expect(clearButton).toBeTruthy()
    await clickElement(clearButton)
    await flush()

    expect(window.location.search).toBe('?utm=keep')

    await cleanup()
  })

  it('restores catalog filters with browser back navigation', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': (url: string) => ({
        body: url.includes('q=Banana')
          ? ecosystemProductsPage([ecosystemProductsResponse[1]], 0, 24, 1)
          : url.includes('q=Apple')
            ? ecosystemProductsPage([ecosystemProductsResponse[0]], 0, 24, 1)
            : ecosystemProductsPage(ecosystemProductsResponse, 0, 24, 2)
      }),
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog?q=Apple')
    await flush()
    await flush()

    const input = document.querySelector('input[aria-label="Buscar productos ecosystem"]') as HTMLInputElement
    expect(input.value).toBe('Apple')
    await setInputElementValue(input, 'Banana')
    await flush()
    await flush()
    expect(window.location.search).toContain('q=Banana')

    window.history.back()
    await waitForMs(50)
    await flush()

    expect(window.location.search).toContain('q=Apple')
    expect((document.querySelector('input[aria-label="Buscar productos ecosystem"]') as HTMLInputElement).value).toBe('Apple')

    await cleanup()
  })

  it('pages through ecosystem products without refetching metadata', async () => {
    const fetchMock = mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': (url: string) => {
        const parsed = new URL(url, 'http://localhost')
        const page = Number(parsed.searchParams.get('page') ?? '0')
        return {
          body: page === 1
            ? ecosystemProductsPage([ecosystemProductsResponse[1]], 1, 1, 2)
            : ecosystemProductsPage([ecosystemProductsResponse[0]], 0, 1, 2)
        }
      },
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('External Apple')
    expect(document.body.textContent).toContain('Página 1 de 2')
    const metadataCallsBefore = fetchMock.mock.calls.filter(([url]) => String(url) === '/api/public/ecosystems/demo-ecosystem').length

    const nextButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Siguiente')
    await clickElement(nextButton)
    await flush()
    await flush()

    expect(window.location.search).toContain('page=1')
    expect(document.body.textContent).toContain('External Banana')
    expect(document.body.textContent).toContain('Página 2 de 2')
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/public/ecosystems/demo-ecosystem').length).toBe(metadataCallsBefore)

    await cleanup()
  })

  it('resets catalog page when filters change', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { id: 's1', slug: 'demo-store', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': (url: string) => {
        const parsed = new URL(url, 'http://localhost')
        const q = parsed.searchParams.get('q')
        return {
          body: q === 'Apple'
            ? ecosystemProductsPage([ecosystemProductsResponse[0]], 0, 24, 1)
            : ecosystemProductsPage([ecosystemProductsResponse[1]], 2, 1, 3)
        }
      },
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog?page=2')
    await flush()
    await flush()

    expect(window.location.search).toContain('page=2')
    const input = document.querySelector('input[aria-label="Buscar productos ecosystem"]') as HTMLInputElement
    await setInputElementValue(input, 'Apple')
    await flush()
    await flush()

    expect(window.location.search).toContain('q=Apple')
    expect(window.location.search).not.toContain('page=')
    expect(document.body.textContent).toContain('External Apple')

    await cleanup()
  })
})
