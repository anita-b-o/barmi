import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

const ecosystemHomeResponse = {
  ecosystem: {
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
  },
  newStores: [
    {
      id: 'store-1',
      slug: 'new-store',
      name: 'New Store',
      category: {
        key: 'almacen',
        label: 'Almacen'
      },
      createdAt: '2026-03-20T12:00:00.000Z'
    },
    {
      id: 'store-2',
      slug: 'late-store',
      name: 'Late Store',
      category: {
        key: 'panaderia',
        label: 'Panaderia'
      },
      createdAt: '2026-03-22T12:00:00.000Z'
    }
  ],
  storeCategories: [
    {
      key: 'almacen',
      label: 'Almacen',
      storeCount: 1
    },
    {
      key: 'panaderia',
      label: 'Panaderia',
      storeCount: 1
    }
  ],
  promotionProducts: [
    {
      id: 'ext-1',
      name: 'External Apple',
      priceAmount: 150,
      currency: 'ARS',
      deliverySupported: true
    }
  ],
  deliveryProducts: [
    {
      id: 'ext-2',
      name: 'External Orange',
      priceAmount: 180,
      currency: 'ARS',
      deliverySupported: true
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
    name: 'External Orange',
    priceAmount: 180,
    currency: 'ARS',
    deliverySupported: true
  },
  {
    id: 'ext-3',
    name: 'External Bread',
    priceAmount: 90,
    currency: 'ARS',
    deliverySupported: false
  }
]

const storesMapResponse = {
  ecosystem: ecosystemHomeResponse.ecosystem,
  categories: ecosystemHomeResponse.storeCategories,
  stores: [
    {
      id: 'store-map-1',
      slug: 'demo-store-barmi',
      name: 'Demo Store Barmi',
      category: {
        key: 'almacen',
        label: 'Almacen'
      },
      hasPublicLocation: true,
      locationLabel: 'La Plata Centro',
      latitude: -34.9,
      longitude: -57.95,
      createdAt: '2026-03-24T12:00:00.000Z'
    },
    {
      id: 'store-map-2',
      slug: 'casa-roja-market',
      name: 'Casa Roja Market',
      category: {
        key: 'panaderia',
        label: 'Panaderia'
      },
      hasPublicLocation: false,
      locationLabel: null,
      latitude: null,
      longitude: null,
      createdAt: '2026-03-18T12:00:00.000Z'
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

function mockHomeRequests() {
  mockFetch({
    '/api/public/ecosystems/demo-ecosystem/home': { body: ecosystemHomeResponse },
    '/api/public/ecosystems/demo-ecosystem/products?activeOnly=true': { body: ecosystemProductsResponse },
    '/api/public/ecosystems/demo-ecosystem/stores/map?location=all': { body: storesMapResponse }
  })
}

describe('ecosystem home', () => {
  it('renders hero, quick access and interleaved carousel sections with public data', async () => {
    mockHomeRequests()

    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Mapa')
    expect(document.body.textContent).toContain('Tiendas')
    expect(document.body.textContent).toContain('Productos')
    expect(document.body.textContent).toContain('Categorías')
    expect(document.body.textContent).toContain('Ir a mapa')
    expect(document.body.textContent).toContain('Ir a tiendas')
    expect(document.body.textContent).toContain('Ir a productos')
    expect(document.body.textContent).toContain('Productos similares a tus compras')
    expect(document.body.textContent).toContain('Productos relevantes')
    expect(document.body.textContent).toContain('Tiendas recomendadas')
    expect(document.body.textContent).toContain('Tiendas destacadas')
    expect(document.body.textContent).toContain('New Store')
    expect(document.body.textContent).toContain('Demo Store Barmi')
    expect(document.body.textContent).toContain('External Apple')
    expect(document.body.textContent).toContain('External Orange')
    expect(document.body.textContent).toContain('External Bread')
    expect(document.body.textContent).not.toContain('Tiendas destacadas para explorar')
    expect(document.body.textContent).not.toContain('Explorá productos desde una entrada simple')

    await cleanup()
  })

  it('keeps public home CTAs wired to existing routes', async () => {
    mockHomeRequests()

    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()

    const links = Array.from(document.querySelectorAll('a')).map((item) => item.getAttribute('href'))
    expect(links).toContain('/ecosystem/stores/map')
    expect(links).toContain('/ecosystem/catalog')
    expect(links).toContain('/public/new-store')

    await cleanup()
  })

  it('does not render legacy content below the carousel composition', async () => {
    mockHomeRequests()

    const { cleanup } = await renderAppAt('/ecosystem')
    await flush()
    await flush()

    const input = document.querySelector('input[aria-label="Buscar en home ecosystem"]') as HTMLInputElement
    expect(input).toBeNull()
    expect(document.body.textContent).not.toContain('Productos con promociones activas')
    expect(document.body.textContent).not.toContain('Productos con entrega disponible')
    expect(document.body.textContent).not.toContain('Seguí explorando productos del ecosystem')

    await cleanup()
  })

  it('scrolls only the carousel that receives the navigation click', async () => {
    mockHomeRequests()
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(420)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150)
    const originalScrollBy = HTMLElement.prototype.scrollBy
    const scrolledElements: HTMLElement[] = []
    const scrollByMock = vi.fn(function scrollBy(this: HTMLElement, options?: ScrollToOptions) {
      scrolledElements.push(this)
      this.scrollLeft += Number(options?.left ?? 0)
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
      configurable: true,
      value: scrollByMock
    })

    const { cleanup } = await renderAppAt('/ecosystem')
    try {
      await flush()
      await flush()

      const productNextButton = Array.from(document.querySelectorAll('button')).find((button) =>
        button.getAttribute('aria-label') === 'Ver más productos de Productos similares a tus compras'
      )
      expect(productNextButton).toBeTruthy()

      await clickElement(productNextButton)
      expect(scrollByMock).toHaveBeenCalledTimes(1)
      expect(scrolledElements[0].className).toContain('ecosystem-product-rails__track')

      const storeNextButton = Array.from(document.querySelectorAll('button')).find((button) =>
        button.getAttribute('aria-label') === 'Ver más tiendas de Tiendas recomendadas'
      )
      expect(storeNextButton).toBeTruthy()

      await clickElement(storeNextButton)
      expect(scrollByMock).toHaveBeenCalledTimes(2)
      expect(scrolledElements[1].className).toContain('ecosystem-store-rails__track')

      await cleanup()
    } finally {
      if (originalScrollBy) {
        Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
          configurable: true,
          value: originalScrollBy
        })
      } else {
        delete (HTMLElement.prototype as Partial<typeof HTMLElement.prototype>).scrollBy
      }
    }
  })
})
