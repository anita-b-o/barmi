import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MapSearchInput } from '@/features/ecosystem/stores-map/components/MapSearchInput'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, renderWithProviders, setInputElementValue, waitForMs } from '../test-utils/testUtils'

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function createDeferredResponse() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ecosystem stores map', () => {
  it('submits immediately and cancels a pending debounced search', async () => {
    vi.useFakeTimers()
    const onSearch = vi.fn()
    const { cleanup, container } = await renderWithProviders(<MapSearchInput value="" onSearch={onSearch} />)

    const input = container.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    const button = container.querySelector('button[aria-label="Buscar en el mapa"]')
    expect(input).toBeTruthy()
    expect(button).toBeTruthy()

    await setInputElementValue(input, '  Casa  ')
    expect(onSearch).not.toHaveBeenCalled()

    await clickElement(button)
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenLastCalledWith('Casa')

    await vi.advanceTimersByTimeAsync(300)
    expect(onSearch).toHaveBeenCalledTimes(1)

    await cleanup()
  })

  it('clears a pending debounced search on unmount', async () => {
    vi.useFakeTimers()
    const onSearch = vi.fn()
    const { cleanup, container } = await renderWithProviders(<MapSearchInput value="" onSearch={onSearch} />)

    const input = container.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    expect(input).toBeTruthy()

    await setInputElementValue(input, 'Casa')
    await cleanup()
    await vi.advanceTimersByTimeAsync(300)

    expect(onSearch).not.toHaveBeenCalled()
  })

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

  it('shows the initial loading state before stores map data is available', async () => {
    const initialStoresMap = createDeferredResponse()
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/public/ecosystems/demo-ecosystem/stores/map')) {
        return initialStoresMap.promise
      }
      return jsonResponse({})
    }) as unknown as typeof fetch

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Cargando tiendas...')
    expect(document.body.textContent).not.toContain('No encontramos tiendas con esos filtros')

    initialStoresMap.resolve(jsonResponse(storesMapResponse))
    await flush()
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
    await waitForMs(300)
    await flush()
    await flush()

    expect(window.location.search).toContain('q=Casa')
    expect(document.body.textContent).toContain('Casa Roja Market')
    expect(handler).toHaveBeenCalled()

    await cleanup()
  })

  it('keeps previous stores visible and shows a subtle update indicator during refetch', async () => {
    const searchStoresMap = createDeferredResponse()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/public/ecosystems/demo-ecosystem/stores/map') && url.includes('q=Casa')) {
        return searchStoresMap.promise
      }
      if (url.includes('/api/public/ecosystems/demo-ecosystem/stores/map')) {
        return jsonResponse(storesMapResponse)
      }
      return jsonResponse({})
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Demo Store Barmi')
    expect(document.body.textContent).toContain('Casa Roja Market')

    const input = document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    await setInputElementValue(input, 'Casa')
    await waitForMs(300)
    await flush()

    expect(window.location.search).toContain('q=Casa')
    expect(document.body.textContent).toContain('Actualizando tiendas...')
    expect(document.body.textContent).toContain('Demo Store Barmi')
    expect(document.body.textContent).toContain('Casa Roja Market')
    expect(document.body.textContent).not.toContain('No encontramos tiendas con esos filtros')

    searchStoresMap.resolve(jsonResponse({
      ...storesMapResponse,
      stores: [storesMapResponse.stores[1]]
    }))
    await flush()
    await flush()

    expect(document.body.textContent).not.toContain('Actualizando tiendas...')
    expect(document.body.textContent).not.toContain('Demo Store Barmi')
    expect(document.body.textContent).toContain('Casa Roja Market')

    await cleanup()
  })

  it('debounces continuous typing before updating the map URL and query', async () => {
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
    const callsBeforeTyping = handler.mock.calls.filter(([url]) => String(url).includes('/stores/map')).length

    const input = document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    expect(input).toBeTruthy()
    await setInputElementValue(input, 'C')
    await setInputElementValue(input, 'Ca')
    await setInputElementValue(input, 'Cas')
    await setInputElementValue(input, 'Casa')

    expect(input.value).toBe('Casa')
    expect(window.location.search).not.toContain('q=Casa')
    expect(handler.mock.calls.filter(([url]) => String(url).includes('/stores/map')).length).toBe(callsBeforeTyping)

    await waitForMs(300)
    await flush()
    await flush()

    const searchCalls = handler.mock.calls.filter(([url]) => String(url).includes('/stores/map') && String(url).includes('q=Casa'))
    expect(window.location.search).toContain('q=Casa')
    expect(searchCalls).toHaveLength(1)
    expect(document.body.textContent).toContain('Casa Roja Market')

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
    await waitForMs(300)
    await flush()

    expect(document.body.textContent).toContain('No encontramos tiendas con esos filtros')

    await cleanup()
  })

  it('shows the error state when stores map loading fails', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        status: 500,
        body: {
          error: {
            code: 'stores_map_failed',
            message: 'No se pudo cargar el mapa de tiendas',
            status: 500
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No se pudo cargar el mapa de tiendas')

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
    const handler = mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map?location=all': { body: storesMapResponse },
      '/api/public/ecosystems/demo-ecosystem/stores/map': { body: storesMapResponse }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all')
    await flush()
    await flush()
    const callsBeforeSelection = handler.mock.calls.filter(([url]) => String(url).includes('/stores/map')).length

    const storeButtons = Array.from(document.querySelectorAll('button')).filter((item) => item.textContent?.includes('Casa Roja Market'))
    expect(storeButtons[0]).toBeTruthy()
    await clickElement(storeButtons[0])
    await flush()

    expect(window.location.search).toContain('store=store-2')
    expect(document.body.textContent).toContain('Casa Roja Market')
    expect(handler.mock.calls.filter(([url]) => String(url).includes('/stores/map')).length).toBe(callsBeforeSelection)
    expect(document.body.textContent).not.toContain('Actualizando tiendas...')

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
    await waitForMs(300)
    await flush()
    await flush()

    expect(window.location.search).toContain('category=panaderia')
    expect(window.location.search).toContain('q=Casa')
    expect(handler).toHaveBeenCalled()

    await cleanup()
  })

  it('cleans empty/default map URL params while preserving unrelated params', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': { body: storesMapResponse }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?q=Casa&category=panaderia&location=all&store=store-2&utm=keep')
    await flush()
    await flush()

    const input = document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    expect(input).toBeTruthy()
    await setInputElementValue(input, '   ')
    await waitForMs(300)
    await flush()
    await flush()

    expect(window.location.search).toBe('?category=panaderia&location=all&utm=keep')

    await cleanup()
  })

  it('restores map filters with browser back navigation', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': (url: string) => ({
        body: url.includes('q=Casa')
          ? { ...storesMapResponse, stores: [storesMapResponse.stores[1]] }
          : url.includes('q=Demo')
            ? { ...storesMapResponse, stores: [storesMapResponse.stores[0]] }
            : storesMapResponse
      })
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?location=all&q=Casa')
    await flush()
    await flush()

    const input = document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement
    expect(input.value).toBe('Casa')
    await setInputElementValue(input, 'Demo')
    await waitForMs(300)
    await flush()
    await flush()
    expect(window.location.search).toContain('q=Demo')

    window.history.back()
    await waitForMs(50)
    await flush()

    expect(window.location.search).toContain('q=Casa')
    expect((document.querySelector('input[aria-label="Buscar tiendas en mapa"]') as HTMLInputElement).value).toBe('Casa')

    await cleanup()
  })
})
