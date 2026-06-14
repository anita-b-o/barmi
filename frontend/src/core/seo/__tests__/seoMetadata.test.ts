import { describe, expect, it } from 'vitest'
import { buildCanonicalUrl, resolveSeoMetadata } from '../seoMetadata'

describe('seo metadata helpers', () => {
  it('builds canonicals without non-indexable query params', () => {
    expect(buildCanonicalUrl('/ecosystem/catalog?q=cafe&sort=relevance&page=2', 'https://barmi.example')).toBe(
      'https://barmi.example/ecosystem/catalog'
    )
    expect(buildCanonicalUrl('/public/demo-store?availableOnly=true&categoryId=c1', 'https://barmi.example/')).toBe(
      'https://barmi.example/public/demo-store'
    )
  })

  it('defaults to indexable metadata', () => {
    const metadata = resolveSeoMetadata({
      title: 'Productos en Demo Ecosystem | Barmi',
      description: 'Explora productos en Demo Ecosystem.',
      path: '/ecosystem/catalog'
    }, 'https://barmi.example')

    expect(metadata.robots).toBe('index,follow')
    expect(metadata.canonicalUrl).toBe('https://barmi.example/ecosystem/catalog')
  })

  it('supports noindex public utility pages', () => {
    const metadata = resolveSeoMetadata({
      title: 'Mapa de tiendas | Barmi',
      description: 'Explora tiendas en el mapa.',
      path: '/ecosystem/stores/map?q=pan',
      robots: 'noindex,follow'
    }, 'https://barmi.example')

    expect(metadata.robots).toBe('noindex,follow')
    expect(metadata.canonicalUrl).toBe('https://barmi.example/ecosystem/stores/map')
  })
})
