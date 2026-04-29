import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setInputElementValue, setSelectElementValue } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 'store-1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' },
      { storeId: 'store-2', storeSlug: 'legacy-store', role: 'ADMIN', status: 'INACTIVE' }
    ],
    ecosystems: []
  }
}

const listResponse = [
  {
    id: 'prod-1',
    storeId: 'store-1',
    sku: 'SKU-1',
    name: 'Cafe tostado',
    priceCents: 1500,
    stockQuantity: 12,
    categoryId: 'cat-1',
    categoryName: 'Bebidas',
    isActive: true,
    isAvailable: true,
    createdAt: '2026-03-13T12:00:00Z'
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    sku: 'SKU-2',
    name: 'Te negro',
    priceCents: 1200,
    stockQuantity: 0,
    categoryId: null,
    categoryName: null,
    isActive: false,
    isAvailable: false,
    createdAt: '2026-03-13T12:05:00Z'
  }
]

const categoriesResponse = [
  {
    id: 'cat-1',
    storeId: 'store-1',
    name: 'Bebidas',
    active: true,
    sortOrder: 10,
    createdAt: '2026-03-13T11:30:00Z'
  }
]

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store products', () => {
  it('renders the screen with active store memberships and loads products', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/products': { body: listResponse },
      '/api/store/categories': { body: categoriesResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Productos STORE')
    expect(document.body.textContent).toContain('demo-store')
    expect(document.body.textContent).not.toContain('legacy-store')
    expect(document.body.textContent).toContain('Cafe tostado')
    expect(document.body.textContent).toContain('Te negro')
    expect(document.body.textContent).toContain('Categorías STORE')

    await cleanup()
  })

  it('creates a product', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/products': (url, init) => {
        if ((init?.method ?? 'GET') === 'POST') {
          return {
            status: 201,
            body: {
              id: 'prod-3',
              storeId: 'store-1',
              sku: 'SKU-3',
              name: 'Yerba',
              priceCents: 1800,
              stockQuantity: 24,
              categoryId: 'cat-1',
              categoryName: 'Bebidas',
              isActive: true,
              isAvailable: true,
              createdAt: '2026-03-13T12:10:00Z'
            }
          }
        }
        return { body: listResponse }
      },
      '/api/store/categories': { body: categoriesResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    await setInputElementValue(inputs[0] as HTMLInputElement, 'SKU-3')
    await setInputElementValue(inputs[1] as HTMLInputElement, 'Yerba')
    await setInputElementValue(inputs[2] as HTMLInputElement, '1800')
    await setInputElementValue(inputs[3] as HTMLInputElement, '24')
    const categorySelect = document.querySelector('select[aria-label="Categoría del producto"]') as HTMLSelectElement
    await setSelectElementValue(categorySelect, 'cat-1')

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear producto'))
    await clickElement(createButton)
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      sku: 'SKU-3',
      name: 'Yerba',
      priceCents: 1800,
      stockQuantity: 24,
      categoryId: 'cat-1'
    })
    expect(document.body.textContent).toContain('Producto creado')

    await cleanup()
  })

  it('edits a product', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/products/prod-1': (url, init) => {
        if ((init?.method ?? 'GET') === 'PUT') {
          return {
            body: {
              id: 'prod-1',
              storeId: 'store-1',
              sku: 'SKU-1A',
              name: 'Cafe premium',
              priceCents: 1900,
              stockQuantity: 7,
              categoryId: 'cat-1',
              categoryName: 'Bebidas',
              isActive: true,
              isAvailable: true,
              createdAt: '2026-03-13T12:00:00Z'
            }
          }
        }
        return { body: listResponse[0] }
      },
      '/api/store/products': { body: listResponse },
      '/api/store/categories': { body: categoriesResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    const editButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Editar')
    await clickElement(editButton)
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    await setInputElementValue(inputs[0] as HTMLInputElement, 'SKU-1A')
    await setInputElementValue(inputs[1] as HTMLInputElement, 'Cafe premium')
    await setInputElementValue(inputs[2] as HTMLInputElement, '1900')
    await setInputElementValue(inputs[3] as HTMLInputElement, '7')
    const categorySelect = document.querySelector('select[aria-label="Categoría del producto"]') as HTMLSelectElement
    await setSelectElementValue(categorySelect, 'cat-1')

    const updateButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar cambios'))
    await clickElement(updateButton)
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/store/products/prod-1' && init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      sku: 'SKU-1A',
      name: 'Cafe premium',
      priceCents: 1900,
      stockQuantity: 7,
      categoryId: 'cat-1'
    })
    expect(document.body.textContent).toContain('Producto actualizado')

    await cleanup()
  })

  it('adjusts stock without editing the full product form manually', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/products/prod-1': (url, init) => {
        if ((init?.method ?? 'GET') === 'PUT') {
          return {
            body: {
              id: 'prod-1',
              storeId: 'store-1',
              sku: 'SKU-1',
              name: 'Cafe tostado',
              priceCents: 1500,
              stockQuantity: 4,
              categoryId: 'cat-1',
              categoryName: 'Bebidas',
              isActive: true,
              isAvailable: true,
              createdAt: '2026-03-13T12:00:00Z'
            }
          }
        }
        return { body: listResponse[0] }
      },
      '/api/store/products': { body: listResponse },
      '/api/store/categories': { body: categoriesResponse }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    const adjustButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Ajustar stock')
    await clickElement(adjustButton)
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Ajustar stock')
    expect(document.body.textContent).toContain('Cafe tostado')

    const stockInput = Array.from(document.querySelectorAll('input')).find((input) => input.getAttribute('placeholder') === '25') as HTMLInputElement
    await setInputElementValue(stockInput, '4')

    const saveStockButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar stock'))
    await clickElement(saveStockButton)
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/store/products/prod-1' && init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      sku: 'SKU-1',
      name: 'Cafe tostado',
      priceCents: 1500,
      stockQuantity: 4,
      categoryId: 'cat-1'
    })
    expect(document.body.textContent).toContain('Stock actualizado')

    await cleanup()
  })

  it('soft deletes a product with confirmation', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/products': { body: listResponse },
      '/api/store/categories': { body: categoriesResponse },
      '/api/store/products/prod-1': {
        body: {
          ...listResponse[0],
          isActive: false
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    const deleteButton = Array.from(document.querySelectorAll('button'))
      .filter((button) => button.textContent === 'Desactivar' && !button.hasAttribute('disabled'))
      .at(-1)
    await clickElement(deleteButton)
    await flush()

    const confirmButton = Array.from(document.querySelectorAll('button')).filter((button) => button.textContent === 'Desactivar').at(-1)
    await clickElement(confirmButton)
    await flush()
    await flush()

    const deleteCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/store/products/prod-1' && init?.method === 'DELETE')
    expect(deleteCall).toBeTruthy()
    expect(document.body.textContent).toContain('Producto desactivado')

    await cleanup()
  })

  it('shows backend errors visibly', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/categories': { body: categoriesResponse },
      '/api/store/products': {
        status: 409,
        body: {
          error: {
            code: 'product_sku_conflict',
            message: 'product_sku_conflict',
            status: 409
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('product_sku_conflict')

    await cleanup()
  })

  it('creates and toggles categories', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/products': { body: listResponse },
      '/api/store/categories': (url, init) => {
        if ((init?.method ?? 'GET') === 'POST') {
          return {
            status: 201,
            body: {
              id: 'cat-2',
              storeId: 'store-1',
              name: 'Snacks',
              active: true,
              sortOrder: 20,
              createdAt: '2026-03-13T11:45:00Z'
            }
          }
        }
        if (init?.method === 'PATCH') {
          return {
            body: {
              ...categoriesResponse[0],
              active: false
            }
          }
        }
        return { body: categoriesResponse }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/products')
    await flush()
    await flush()

    const categoryNameInput = Array.from(document.querySelectorAll('input')).find((input) => input.getAttribute('placeholder') === 'Bebidas') as HTMLInputElement
    const categoryOrderInput = Array.from(document.querySelectorAll('input')).find((input) => input.getAttribute('placeholder') === '0') as HTMLInputElement
    await setInputElementValue(categoryNameInput, 'Snacks')
    await setInputElementValue(categoryOrderInput, '20')

    const createCategoryButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear categoría'))
    await clickElement(createCategoryButton)
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/store/categories' && init?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({ name: 'Snacks', sortOrder: 20 })

    const toggleCategoryButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Desactivar')
    await clickElement(toggleCategoryButton)
    await flush()
    await flush()

    const patchCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/store/categories/cat-1/active' && init?.method === 'PATCH')
    expect(patchCall).toBeTruthy()
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ active: false })

    await cleanup()
  })
})
