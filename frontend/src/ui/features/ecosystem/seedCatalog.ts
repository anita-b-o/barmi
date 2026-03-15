export const ecosystemId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export type EcosystemSeedProduct = {
  id: string
  name: string
  priceAmount: number
  currency: string
}

export const seedCatalog: EcosystemSeedProduct[] = [
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'External Apple',
    priceAmount: 150.0,
    currency: 'ARS'
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    name: 'External Banana',
    priceAmount: 120.0,
    currency: 'ARS'
  }
]
