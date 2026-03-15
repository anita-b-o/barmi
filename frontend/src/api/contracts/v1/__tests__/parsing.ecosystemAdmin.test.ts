import { describe, expect, it } from 'vitest'
import productsListSample from '../_samples/ecosystem.admin.products.list.json'
import productSample from '../_samples/ecosystem.admin.product.json'
import {
  parseEcosystemExternalProduct,
  parseEcosystemExternalProducts
} from '../../../adapters/ecosystemAdminAdapter'

describe('ecosystem admin contracts parsing', () => {
  it('parses products list sample', () => {
    const res = parseEcosystemExternalProducts(productsListSample)
    expect(res).toHaveLength(2)
    expect(res[0].name).toBe('Product Alpha')
  })

  it('parses product sample', () => {
    const res = parseEcosystemExternalProduct(productSample)
    expect(res.id).toBe('p3333333-3333-3333-3333-333333333333')
    expect(res.deliverySupported).toBe(true)
  })
})
