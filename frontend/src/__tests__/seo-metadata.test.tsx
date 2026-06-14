import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

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

describe('public SEO metadata', () => {
  it('sets ecosystem catalog metadata with a clean canonical', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem': { body: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] } },
      '/api/public/ecosystems/demo-ecosystem/products': {
        body: { content: [], page: 0, size: 24, totalElements: 0, totalPages: 0 }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/catalog?q=cafe&sort=relevance&page=2')
    await flush()
    await flush()

    expect(document.title).toBe('Productos en Demo Ecosystem | Barmi')
    expect(metaContent('meta[name="description"]')).toContain('Demo Ecosystem')
    expect(metaContent('meta[property="og:url"]')).toBe('http://localhost:3000/ecosystem/catalog')
    expect(canonicalHref()).toBe('http://localhost:3000/ecosystem/catalog')
    await cleanup()
  })

  it('marks the stores map noindex', async () => {
    mockFetch({
      '/api/public/ecosystems/demo-ecosystem/stores/map': {
        body: {
          ecosystem: { id: 'eco-1', slug: 'demo-ecosystem', name: 'Demo Ecosystem', promotions: [] },
          categories: [],
          stores: []
        }
      }
    })

    const { cleanup } = await renderAppAt('/ecosystem/stores/map?q=centro')
    await flush()
    await flush()

    expect(metaContent('meta[name="robots"]')).toBe('noindex,follow')
    expect(canonicalHref()).toBe('http://localhost:3000/ecosystem/stores/map')
    await cleanup()
  })

  it('sets public store metadata from the store name and category', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          slug: 'demo-store',
          id: 's1',
          name: 'Demo Store',
          categories: [{ id: 'c1', slug: 'c1', name: 'Panaderia', sortOrder: 1 }],
          promotions: []
        }
      },
      '/api/public/stores/demo-store/products': {
        body: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store?availableOnly=true&page=1')
    await flush()
    await flush()

    expect(document.title).toBe('Demo Store | Barmi')
    expect(metaContent('meta[name="description"]')).toContain('Panaderia')
    expect(canonicalHref()).toBe('http://localhost:3000/public/demo-store')
    await cleanup()
  })
})
