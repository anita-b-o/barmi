import { describe, expect, it } from 'vitest'
import ecosystemSample from '../_samples/public.ecosystem.json'
import ecosystemProductsSample from '../_samples/public.ecosystem.products.json'
import storeSample from '../_samples/public.store.json'
import productsSample from '../_samples/public.products.json'
import { parsePublicProducts, parsePublicStore } from '../../../adapters/publicAdapter'
import { parsePublicEcosystem, parsePublicEcosystemProducts } from '../../../adapters/publicEcosystemAdapter'

describe('public contracts parsing', () => {
  it('parses public store sample', () => {
    const store = parsePublicStore(storeSample)
    expect(store.slug).toBe('demo-store')
    expect(store.id).toBe('11111111-1111-1111-1111-111111111111')
    expect(store.name).toBe('Demo Store')
  })

  it('parses public products sample', () => {
    const products = parsePublicProducts(productsSample)
    expect(products).toHaveLength(2)
    expect(products[0].id).toBe('22222222-2222-2222-2222-222222222222')
    expect(products[0].priceCents).toBe(15000)
    expect(products[1].sku).toBe('SKU-BANANA')
  })

  it('parses public ecosystem sample', () => {
    const ecosystem = parsePublicEcosystem(ecosystemSample)
    expect(ecosystem.id).toBe('33333333-3333-3333-3333-333333333333')
    expect(ecosystem.slug).toBe('demo-ecosystem')
    expect(ecosystem.name).toBe('Demo Ecosystem')
  })

  it('parses public ecosystem products sample', () => {
    const products = parsePublicEcosystemProducts(ecosystemProductsSample)
    expect(products).toHaveLength(2)
    expect(products[0].name).toBe('External Apple')
    expect(products[0].deliverySupported).toBe(true)
    expect(products[1].currency).toBe('ARS')
  })
})
