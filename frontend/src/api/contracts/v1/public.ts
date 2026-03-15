export type PublicStore = {
  slug: string
  id: string
  name: string
}

export type PublicEcosystem = {
  id: string
  slug: string
  name: string
}

export type PublicEcosystemProduct = {
  id: string
  name: string
  priceAmount: number
  currency: string
  deliverySupported: boolean
}

export type PublicProduct = {
  priceCents: number
  id: string
  name: string
  sku: string
}
