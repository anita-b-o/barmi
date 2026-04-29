import type { ProductRailGroup } from './productRails'
import type { StoreRailGroup } from './storeRails'

export type HomeCarouselSection =
  | {
      id: string
      type: 'product'
      group: ProductRailGroup
    }
  | {
      id: string
      type: 'store'
      group: StoreRailGroup
    }

export function buildMixedHomeSections(
  productGroups: ProductRailGroup[],
  storeGroups: StoreRailGroup[],
  productCarouselsPerStoreCarousel = 2
): HomeCarouselSection[] {
  const sections: HomeCarouselSection[] = []
  let productIndex = 0
  let storeIndex = 0

  while (productIndex < productGroups.length || storeIndex < storeGroups.length) {
    const productsInThisBlock = productGroups.length > productIndex
      ? productCarouselsPerStoreCarousel
      : 0

    for (let i = 0; i < productsInThisBlock && productIndex < productGroups.length; i += 1) {
      const group = productGroups[productIndex]
      sections.push({ id: `product-${group.id}`, type: 'product', group })
      productIndex += 1
    }

    if (storeIndex < storeGroups.length) {
      const group = storeGroups[storeIndex]
      sections.push({ id: `store-${group.id}`, type: 'store', group })
      storeIndex += 1
    }
  }

  return sections
}
