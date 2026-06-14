import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt } from '../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('public store availability', () => {
  it('renders stock availability and disables add for out-of-stock products', async () => {
    mockFetch({
      '/api/public/stores/demo-store': {
        body: {
          id: 'store-1',
          slug: 'demo-store',
          name: 'Demo Store'
        }
      },
      '/api/public/stores/demo-store/products': {
        body: {
          content: [
            {
              id: 'prod-1',
              slug: 'prod-1',
              sku: 'SKU-1',
              name: 'Cafe',
              priceCents: 1500,
              stockQuantity: 3,
              isAvailable: true
            },
            {
              id: 'prod-2',
              slug: 'prod-2',
              sku: 'SKU-2',
              name: 'Te',
              priceCents: 1200,
              stockQuantity: 0,
              isAvailable: false
            }
          ],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1
        }
      }
    })

    const { cleanup } = await renderAppAt('/public/demo-store')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Stock disponible: 3')
    expect(document.body.textContent).toContain('Sin stock disponible')

    const buttons = Array.from(document.querySelectorAll('button'))
    const addButton = buttons.find((button) => button.textContent === 'Agregar')
    const outOfStockButton = buttons.find((button) => button.textContent === 'Sin stock')

    expect(addButton).toBeTruthy()
    expect(outOfStockButton).toBeTruthy()
    expect((outOfStockButton as HTMLButtonElement).disabled).toBe(true)

    await clickElement(addButton)
    await flush()

    expect(document.body.textContent).toContain('Cafe')
    await cleanup()
  })
})
