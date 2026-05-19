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

const MAX_HOME_PRODUCT_GROUPS = 3
const MAX_HOME_STORE_GROUPS = 2
const MAX_HOME_SECTIONS = 5

export function buildMixedHomeSections(
  productGroups: ProductRailGroup[],
  storeGroups: StoreRailGroup[],
  productCarouselsPerStoreCarousel = 2
): HomeCarouselSection[] {
  const populatedProductGroups = productGroups.filter((group) => group.products.length > 0)
  const populatedStoreGroups = storeGroups.filter((group) => group.stores.length > 0)
  const availableProductGroups = populatedProductGroups.slice(0, MAX_HOME_PRODUCT_GROUPS)
  const availableStoreGroups = populatedStoreGroups.slice(0, MAX_HOME_STORE_GROUPS)
  const sections: HomeCarouselSection[] = []
  let productIndex = 0
  let storeIndex = 0

  while (
    sections.length < MAX_HOME_SECTIONS
    && (productIndex < availableProductGroups.length || storeIndex < availableStoreGroups.length)
  ) {
    const productsInThisBlock = availableProductGroups.length > productIndex
      ? productCarouselsPerStoreCarousel
      : 0

    for (
      let i = 0;
      i < productsInThisBlock
      && productIndex < availableProductGroups.length
      && sections.length < MAX_HOME_SECTIONS;
      i += 1
    ) {
      const group = availableProductGroups[productIndex]
      sections.push({ id: `product-${group.id}`, type: 'product', group })
      productIndex += 1
    }

    if (storeIndex < availableStoreGroups.length && sections.length < MAX_HOME_SECTIONS) {
      const group = availableStoreGroups[storeIndex]
      sections.push({ id: `store-${group.id}`, type: 'store', group })
      storeIndex += 1
    }
  }

  return sections
}
