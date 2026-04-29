import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setInputElementValue, setSelectElementValue, clickElement } from '../test-utils/testUtils'

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
      '/api/public/stores/demo-store': { body: { slug: 'demo-store', id: 's1', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': { body: ecosystemProductsResponse },
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
    expect(document.body.textContent).not.toContain('Carrito Ecosystem')

    await cleanup()
  })

  it('hides promotions block when there are no visible promotions', async () => {
    mockFetch({
      '/api/public/stores/demo-store': { body: { slug: 'demo-store', id: 's1', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: { ...ecosystemResponse, promotions: [] } },
      '/api/public/ecosystems/demo-ecosystem/products': { body: ecosystemProductsResponse },
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
      '/api/public/stores/demo-store': { body: { slug: 'demo-store', id: 's1', name: 'Demo Store' } },
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
      '/api/public/stores/demo-store': { body: { slug: 'demo-store', id: 's1', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': (url: string) => {
        const parsed = new URL(url, 'http://localhost')
        const sort = parsed.searchParams.get('sort')
        const deliverySupported = parsed.searchParams.get('deliverySupported')
        let catalog = [...ecosystemProductsResponse]
        if (deliverySupported === 'true') {
          catalog = catalog.filter((product) => product.deliverySupported)
        }
        if (sort === 'price,asc') {
          catalog = [...catalog].sort((a, b) => a.priceAmount - b.priceAmount)
        }
        return { body: catalog }
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
})
