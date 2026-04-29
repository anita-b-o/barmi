import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setInputElementValue } from '../test-utils/testUtils'

const storesMapResponse = {
  ecosystem: {
    id: 'eco-1',
    slug: 'demo-ecosystem',
    name: 'Demo Ecosystem',
    promotions: []
  },
  categories: [
    { key: 'cafeteria', label: 'Cafeteria', storeCount: 1 },
    { key: 'panaderia', label: 'Panaderia', storeCount: 1 }
  ],
  stores: [
    {
      id: 'store-1',
      slug: 'demo-store',
      name: 'Demo Store Barmi',
      category: { key: 'cafeteria', label: 'Cafeteria' },
      hasPublicLocation: true,
      locationLabel: 'La Plata Centro',
      latitude: -34.920494,
      longitude: -57.953565,
      createdAt: '2026-03-20T12:00:00.000Z'
    },
    {
      id: 'store-2',
      slug: 'casa-roja',
      name: 'Casa Roja Market',
      category: { key: 'panaderia', label: 'Panaderia' },
      hasPublicLocation: false,
      locationLabel: null,
      latitude: null,
      longitude: null,
      createdAt: '2026-03-21T12:00:00.000Z'
    }
  ]
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ecosystem stores map', () => {
  it('renders the exploratory map state from the public API', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': { body: storesMapResponse }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cerca de mí')
    expect(document.body.textContent).toContain('Indumentaria')
    expect(document.body.textContent).toContain('Femenina')
    expect(document.body.textContent).toContain('Restaurantes')
    expect(document.body.textContent).toContain('Hospedaje')
    expect(document.body.textContent).not.toContain('Demo Store Barmi')

    await cleanup()
  })

  it('searches stores by name from the map screen', async () => {
    const handler = mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': (url: string) => ({
        body: url.includes('q=Casa')
          ? { ...storesMapResponse, stores: [storesMapResponse.stores[1]] }
          : storesMapResponse
      })
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map')
    await flush()
    await flush()

    const input = document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    expect(input).toBeTruthy()
    await setInputElementValue(input, 'Casa')
    await new Promise((resolve) => setTimeout(resolve, 300))
    await flush()
    await flush()

    expect(window.location.search).toContain('q=Casa')
    expect(document.body.textContent).toContain('Casa Roja Market')
    expect(handler).toHaveBeenCalled()

    await cleanup()
  })

  it('shows filtered results when location=all is active', async () => {
    const handler = mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': (url: string) => ({
        body: url.includes('location=all') ? storesMapResponse : { ...storesMapResponse, stores: [storesMapResponse.stores[0]] }
      })
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()

    expect(window.location.search).toContain('location=all')
    expect(document.body.textContent).toContain('Casa Roja Market')
    expect(document.body.textContent).toContain('Demo Store Barmi')
    expect(handler).toHaveBeenCalled()

    await cleanup()
  })

  it('filters stores from an exploratory category and keeps the query in the url', async () => {
    const handler = mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': (url: string) => ({
        body: url.includes('q=indumentaria+femenina')
          ? { ...storesMapResponse, stores: [storesMapResponse.stores[1]] }
          : storesMapResponse
      })
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map')
    await flush()
    await flush()

    const feminineCategory = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Femenina')
    expect(feminineCategory).toBeTruthy()
    await clickElement(feminineCategory)
    await flush()
    await flush()

    expect(window.location.search).toContain('q=indumentaria+femenina')
    expect(document.body.textContent).toContain('Casa Roja Market')
    expect(handler).toHaveBeenCalled()

    await cleanup()
  })

  it('shows an empty state when filters return no stores', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': (url: string) => ({
        body: url.includes('q=zzz') ? { ...storesMapResponse, stores: [] } : storesMapResponse
      })
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()

    const input = document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    expect(input).toBeTruthy()
    await setInputElementValue(input, 'zzz')
    await new Promise((resolve) => setTimeout(resolve, 300))
    await flush()

    expect(document.body.textContent).toContain('No encontramos tiendas con esos filtros')

    await cleanup()
  })

  it('offers direct navigation to the public store from results', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': { body: storesMapResponse }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()

    const storeLinks = Array.from(document.querySelectorAll('a')).map((item) => item.getAttribute('href'))
    expect(storeLinks).toContain('/public/demo-store')
    expect(storeLinks).toContain('/public/casa-roja')

    await cleanup()
  })

  it('keeps map and list selection aligned when choosing a store from the list', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map?location=all': { body: storesMapResponse },
      '/api/public/ecosystems/demo-ecosystem/stores/map': { body: storesMapResponse }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()

    const storeButtons = Array.from(document.querySelectorAll('button')).filter((item) => item.textContent?.includes('Casa Roja Market'))
    expect(storeButtons[0]).toBeTruthy()
    await clickElement(storeButtons[0])
    await flush()

    expect(window.location.search).toContain('store=store-2')
    expect(document.body.textContent).toContain('Casa Roja Market')

    await cleanup()
  })

  it('restores selection from the store query param', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map?location=all': { body: storesMapResponse },
      '/api/public/ecosystems/demo-ecosystem/stores/map': { body: storesMapResponse }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all&store=store-2')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Casa Roja Market')
    expect(document.body.textContent).toContain('Sin mapa todavía')

    await cleanup()
  })

  it('keeps category query params and search compatible', async () => {
    const handler = mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': (url: string) => ({
        body: url.includes('category=panaderia') && url.includes('q=Casa')
          ? { ...storesMapResponse, stores: [storesMapResponse.stores[1]] }
          : storesMapResponse
      })
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?category=panaderia')
    await flush()
    await flush()

    const input = document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    expect(input).toBeTruthy()
    await setInputElementValue(input, 'Casa')
    await new Promise((resolve) => setTimeout(resolve, 300))
    await flush()
    await flush()

    expect(window.location.search).toContain('category=panaderia')
    expect(window.location.search).toContain('q=Casa')
    expect(handler).toHaveBeenCalled()

    await cleanup()
  })
})
