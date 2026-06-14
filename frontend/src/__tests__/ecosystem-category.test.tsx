import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

function metaContent(selector: string) {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content
}

function canonicalHref() {
  return document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  document.head.querySelectorAll('meta[name="description"], meta[name="robots"], meta[property^="og:"], link[rel="canonical"]').forEach((node) => node.remove())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ecosystem category landing', () => {
  it('renders category landing with SEO metadata and clean canonical', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        body: {
          ecosystem: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] },
          categories: [{ key: 'panaderia', label: 'Panaderia', storeCount: 1 }],
          stores: [{
            id: 's1',
            slug: 'la-miga',
            name: 'La Miga',
            category: { key: 'panaderia', label: 'Panaderia' },
            hasPublicLocation: true,
            locationLabel: 'Centro',
            latitude: -34.9,
            longitude: -57.9,
            createdAt: '2026-01-01T00:00:00Z'
          }]
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/categories/panaderia?utm_source=test')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Panaderia en Demo Ecosystem')
    expect(document.body.textContent).toContain('La Miga')
    expect(document.title).toBe('Panaderia en Demo Ecosystem | Barmi')
    expect(metaContent('meta[name="description"]')).toContain('Panaderia')
    expect(metaContent('meta[name="robots"]')).toBe('index,follow')
    expect(metaContent('meta[property="og:url"]')).toBe('http://localhost:3000/ecosystem/categories/panaderia')
    expect(canonicalHref()).toBe('http://localhost:3000/ecosystem/categories/panaderia')
    await cleanup()
  })

  it('normalizes encoded route segments and keeps map CTA aligned with map filters', async () => {
    const fetchMock = mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        body: {
          ecosystem: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] },
          categories: [{ key: 'panaderia', label: 'Panaderia', storeCount: 1 }],
          stores: [{
            id: 's1',
            slug: 'la-miga',
            name: 'La Miga',
            category: { key: 'panaderia', label: 'Panaderia' },
            hasPublicLocation: true,
            locationLabel: 'Centro',
            latitude: -34.9,
            longitude: -57.9,
            createdAt: '2026-01-01T00:00:00Z'
          }]
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/categories/%20PANADERIA%20?utm_source=test')
    await flush()
    await flush()

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('category=panaderia'))).toBe(true)
    expect(canonicalHref()).toBe('http://localhost:3000/ecosystem/categories/panaderia')

    const mapButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent === 'Ver en mapa')
    await clickElement(mapButton)
    expect(window.location.pathname).toBe('/ecosystem/stores/map')
    expect(window.location.search).toBe('?category=panaderia&location=all')

    await cleanup()
  })

  it('shows a reasonable error state for missing categories', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        status: 400,
        body: {
          error: {
            code: 'invalid_store_category',
            message: 'invalid_store_category',
            status: 400
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/categories/no-existe')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('No pudimos cargar esta categoria publica')
    expect(metaContent('meta[name="robots"]')).toBe('noindex,follow')
    expect(metaContent('meta[property="og:url"]')).toBe('http://localhost:3000/ecosystem/categories/no-existe')
    expect(canonicalHref()).toBe('http://localhost:3000/ecosystem/categories/no-existe')
    await cleanup()
  })
})
