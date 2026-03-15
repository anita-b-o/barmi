import { describe, expect, it } from 'vitest'
import zonesListSample from '../_samples/store.admin.shipping.zones.list.json'
import zoneSample from '../_samples/store.admin.shipping.zone.json'
import { parseStoreShippingZone, parseStoreShippingZones } from '../../../adapters/storeAdminAdapter'

describe('store admin contracts parsing', () => {
  it('parses shipping zones list sample', () => {
    const res = parseStoreShippingZones(zonesListSample)
    expect(res).toHaveLength(2)
    expect(res[0].type).toBe('EXACT')
    expect(res[1].type).toBe('RANGE')
  })

  it('parses shipping zone sample', () => {
    const res = parseStoreShippingZone(zoneSample)
    expect(res.zoneId).toBe('e3333333-3333-3333-3333-333333333333')
    expect(res.postalCode).toBe('1900')
  })
})
