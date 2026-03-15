import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../../test-utils/testUtils'

const ecosystemResponse = {
  id: 'eco-1',
  slug: 'demo-ecosystem',
  name: 'Demo Ecosystem'
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

    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Demo Ecosystem')
    expect(document.body.textContent).toContain('External Apple')
    expect(document.body.textContent).toContain('Entrega disponible')
    expect(document.body.textContent).toContain('Sin entrega')
    expect(document.body.textContent).not.toContain('Carrito Ecosystem')

    await cleanup()
  })

  it('shows empty state when search returns no products', async () => {
    const fetchMock = mockFetch({
      '/api/public/stores/demo-store': { body: { slug: 'demo-store', id: 's1', name: 'Demo Store' } },
      '/api/public/stores/demo-store/products': { body: [] },
      '/api/public/ecosystems/demo-ecosystem': { body: ecosystemResponse },
      '/api/public/ecosystems/demo-ecosystem/products': (url: string) => ({
        body: url.includes('query=pear') ? [] : ecosystemProductsResponse
      }),
      '/api/auth/me': { body: { userId: 'u1', email: 'admin@example.com', memberships: { stores: [], ecosystems: [] } } }
    })

    const { cleanup, container } = await renderAppAt('/ecosystem')
    await flush()
    await flush()

    const input = container.querySelector('input')
    expect(input).not.toBeNull()

    input!.dispatchEvent(new Event('input', { bubbles: true }))
    Object.defineProperty(input, 'value', { value: 'pear', configurable: true })
    input!.dispatchEvent(new Event('change', { bubbles: true }))

    await flush()
    await flush()

    expect(fetchMock).toHaveBeenCalled()
    expect(document.body.textContent).toContain('No hay productos para esa búsqueda')

    await cleanup()
  })
})
