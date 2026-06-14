import { beforeEach, describe, expect, it } from 'vitest'
import { useEcosystemCart } from '@/features/ecosystem/cart/ecosystemCartContext'
import { useCart } from '@/features/store/cart/cartContext'
import { clearStorage, clickElement, flush, renderWithProviders } from '../test-utils/testUtils'

function StoreCartProbe() {
  const cart = useCart()
  const firstItem = cart.items[0]

  return (
    <div>
      <span data-testid="store-slug">{cart.storeSlug ?? ''}</span>
      <span data-testid="store-count">{cart.items.length}</span>
      <span data-testid="store-first-product">{firstItem?.productId ?? ''}</span>
      <span data-testid="store-first-qty">{firstItem?.qty ?? 0}</span>
      <button
        type="button"
        data-testid="add-store-a"
        onClick={() => cart.addItem('store-a', { productId: 'p1', name: 'Producto 1', priceCents: 1000 })}
      >
        Add store A
      </button>
      <button
        type="button"
        data-testid="add-store-b"
        onClick={() => cart.addItem('store-b', { productId: 'p2', name: 'Producto 2', priceCents: 2000 })}
      >
        Add store B
      </button>
      <button
        type="button"
        data-testid="add-invalid-store"
        onClick={() => cart.addItem('store-a', { productId: '', name: 'Producto inválido', priceCents: Number.POSITIVE_INFINITY })}
      >
        Add invalid store
      </button>
      <button type="button" data-testid="set-store-three" onClick={() => cart.setItemQuantity('p1', 3)}>
        Set store 3
      </button>
      <button type="button" data-testid="set-store-fraction" onClick={() => cart.setItemQuantity('p1', 1.5)}>
        Set store fraction
      </button>
      <button type="button" data-testid="set-store-infinite" onClick={() => cart.setItemQuantity('p1', Number.POSITIVE_INFINITY)}>
        Set store infinite
      </button>
      <button type="button" data-testid="set-store-negative" onClick={() => cart.setItemQuantity('p1', -2)}>
        Set store negative
      </button>
    </div>
  )
}

function EcosystemCartProbe() {
  const cart = useEcosystemCart()
  const firstItem = cart.items[0]

  return (
    <div>
      <span data-testid="ecosystem-count">{cart.items.length}</span>
      <span data-testid="ecosystem-first-product">{firstItem?.externalProductId ?? ''}</span>
      <span data-testid="ecosystem-first-qty">{firstItem?.qty ?? 0}</span>
      <button
        type="button"
        data-testid="add-ecosystem"
        onClick={() => cart.addItem({
          externalProductId: 'e1',
          name: 'Producto Eco',
          unitPriceAmount: 120,
          currency: 'ARS',
          deliverySupported: true
        })}
      >
        Add ecosystem
      </button>
      <button
        type="button"
        data-testid="add-invalid-ecosystem"
        onClick={() => cart.addItem({
          externalProductId: '',
          name: 'Producto inválido',
          unitPriceAmount: Number.POSITIVE_INFINITY,
          currency: 'ARS',
          deliverySupported: true
        })}
      >
        Add invalid ecosystem
      </button>
      <button type="button" data-testid="set-ecosystem-three" onClick={() => cart.setQuantity('e1', 3)}>
        Set ecosystem 3
      </button>
      <button type="button" data-testid="set-ecosystem-fraction" onClick={() => cart.setQuantity('e1', 1.5)}>
        Set ecosystem fraction
      </button>
      <button type="button" data-testid="set-ecosystem-infinite" onClick={() => cart.setQuantity('e1', Number.POSITIVE_INFINITY)}>
        Set ecosystem infinite
      </button>
      <button type="button" data-testid="set-ecosystem-negative" onClick={() => cart.setQuantity('e1', -2)}>
        Set ecosystem negative
      </button>
    </div>
  )
}

function text(container: HTMLElement, testId: string) {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? ''
}

describe('cart contexts', () => {
  beforeEach(() => {
    clearStorage()
  })

  it('uses the store cart context as source of truth and replaces items when switching store', async () => {
    const { container, cleanup } = await renderWithProviders(<StoreCartProbe />)

    await clickElement(container.querySelector('[data-testid="add-store-a"]'))
    await clickElement(container.querySelector('[data-testid="add-store-a"]'))
    await flush()

    expect(text(container, 'store-slug')).toBe('store-a')
    expect(text(container, 'store-count')).toBe('1')
    expect(text(container, 'store-first-product')).toBe('p1')
    expect(text(container, 'store-first-qty')).toBe('2')

    await clickElement(container.querySelector('[data-testid="add-store-b"]'))
    await flush()

    expect(text(container, 'store-slug')).toBe('store-b')
    expect(text(container, 'store-count')).toBe('1')
    expect(text(container, 'store-first-product')).toBe('p2')
    expect(text(container, 'store-first-qty')).toBe('1')
    expect(JSON.parse(window.localStorage.getItem('barmi.cart.v1') ?? '{}')).toEqual({
      storeSlug: 'store-b',
      items: [{ productId: 'p2', name: 'Producto 2', priceCents: 2000, qty: 1 }]
    })

    await cleanup()
  })

  it('drops invalid persisted store carts instead of rehydrating orphan or impossible quantities', async () => {
    window.localStorage.setItem('barmi.cart.v1', JSON.stringify({
      storeSlug: null,
      items: [{ productId: 'p1', name: 'Producto 1', priceCents: 1000, qty: 1 }]
    }))

    const orphan = await renderWithProviders(<StoreCartProbe />)
    expect(text(orphan.container, 'store-count')).toBe('0')
    await orphan.cleanup()

    window.localStorage.setItem('barmi.cart.v1', JSON.stringify({
      storeSlug: 'store-a',
      items: [{ productId: 'p1', name: 'Producto 1', priceCents: 1000, qty: -2 }]
    }))

    const negativeQty = await renderWithProviders(<StoreCartProbe />)
    expect(text(negativeQty.container, 'store-count')).toBe('0')
    await negativeQty.cleanup()
  })

  it('ignores invalid store add and quantity updates while preserving valid quantity behavior', async () => {
    const { container, cleanup } = await renderWithProviders(<StoreCartProbe />)

    await clickElement(container.querySelector('[data-testid="add-invalid-store"]'))
    await flush()

    expect(text(container, 'store-count')).toBe('0')

    await clickElement(container.querySelector('[data-testid="add-store-a"]'))
    await clickElement(container.querySelector('[data-testid="set-store-three"]'))
    await flush()

    expect(text(container, 'store-first-qty')).toBe('3')

    await clickElement(container.querySelector('[data-testid="set-store-fraction"]'))
    await clickElement(container.querySelector('[data-testid="set-store-infinite"]'))
    await flush()

    expect(text(container, 'store-first-qty')).toBe('3')

    await clickElement(container.querySelector('[data-testid="set-store-negative"]'))
    await flush()

    expect(text(container, 'store-count')).toBe('0')
    expect(text(container, 'store-slug')).toBe('')

    await cleanup()
  })

  it('uses the ecosystem cart context as source of truth and increments matching products', async () => {
    const { container, cleanup } = await renderWithProviders(<EcosystemCartProbe />)

    await clickElement(container.querySelector('[data-testid="add-ecosystem"]'))
    await clickElement(container.querySelector('[data-testid="add-ecosystem"]'))
    await flush()

    expect(text(container, 'ecosystem-count')).toBe('1')
    expect(text(container, 'ecosystem-first-product')).toBe('e1')
    expect(text(container, 'ecosystem-first-qty')).toBe('2')
    expect(JSON.parse(window.localStorage.getItem('barmi.ecosystemCart.v1') ?? '{}')).toEqual({
      items: [{
        externalProductId: 'e1',
        name: 'Producto Eco',
        unitPriceAmount: 120,
        qty: 2,
        currency: 'ARS',
        deliverySupported: true
      }]
    })

    await cleanup()
  })

  it('drops invalid persisted ecosystem carts before checkout can consume them', async () => {
    window.localStorage.setItem('barmi.ecosystemCart.v1', JSON.stringify({
      items: [{
        externalProductId: 'e1',
        name: 'Producto Eco',
        unitPriceAmount: -120,
        qty: 1,
        currency: 'ARS',
        deliverySupported: true
      }]
    }))

    const invalidPrice = await renderWithProviders(<EcosystemCartProbe />)
    expect(text(invalidPrice.container, 'ecosystem-count')).toBe('0')
    await invalidPrice.cleanup()

    window.localStorage.setItem('barmi.ecosystemCart.v1', JSON.stringify({
      items: [{
        externalProductId: 'e1',
        name: 'Producto Eco',
        unitPriceAmount: 120,
        qty: 1.5,
        currency: 'ARS',
        deliverySupported: true
      }]
    }))

    const fractionalQty = await renderWithProviders(<EcosystemCartProbe />)
    expect(text(fractionalQty.container, 'ecosystem-count')).toBe('0')
    await fractionalQty.cleanup()
  })

  it('ignores invalid ecosystem add and quantity updates while preserving valid quantity behavior', async () => {
    const { container, cleanup } = await renderWithProviders(<EcosystemCartProbe />)

    await clickElement(container.querySelector('[data-testid="add-invalid-ecosystem"]'))
    await flush()

    expect(text(container, 'ecosystem-count')).toBe('0')

    await clickElement(container.querySelector('[data-testid="add-ecosystem"]'))
    await clickElement(container.querySelector('[data-testid="set-ecosystem-three"]'))
    await flush()

    expect(text(container, 'ecosystem-first-qty')).toBe('3')

    await clickElement(container.querySelector('[data-testid="set-ecosystem-fraction"]'))
    await clickElement(container.querySelector('[data-testid="set-ecosystem-infinite"]'))
    await flush()

    expect(text(container, 'ecosystem-first-qty')).toBe('3')

    await clickElement(container.querySelector('[data-testid="set-ecosystem-negative"]'))
    await flush()

    expect(text(container, 'ecosystem-count')).toBe('0')

    await cleanup()
  })
})
