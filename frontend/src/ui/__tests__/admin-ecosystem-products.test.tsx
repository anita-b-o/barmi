import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../../test-utils/testUtils'

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set
  setter?.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [],
    ecosystems: [
      { ecosystemId: 'eco-1', ecosystemSlug: 'demo-ecosystem', role: 'OWNER', status: 'ACTIVE' },
      { ecosystemId: 'eco-2', ecosystemSlug: 'inactive-ecosystem', role: 'OWNER', status: 'INACTIVE' }
    ]
  }
}

const listResponse = [
  {
    id: 'prod-1',
    ecosystemId: 'eco-1',
    name: 'Alfajor',
    priceAmount: 100,
    currency: 'ARS',
    deliverySupported: true,
    isActive: true,
    createdAt: '2026-03-13T12:00:00Z'
  },
  {
    id: 'prod-2',
    ecosystemId: 'eco-1',
    name: 'Café',
    priceAmount: 120,
    currency: 'ARS',
    deliverySupported: false,
    isActive: false,
    createdAt: '2026-03-13T12:05:00Z'
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

describe('admin ecosystem products', () => {
  it('renders the screen with active ecosystem memberships and loads products', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/products?ecosystemId=eco-1&activeOnly=false': { body: listResponse }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/products')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Ecosystem Products')
    expect(document.body.textContent).toContain('demo-ecosystem')
    expect(document.body.textContent).not.toContain('inactive-ecosystem')
    expect(document.body.textContent).toContain('Alfajor')
    expect(document.body.textContent).toContain('Café')

    await cleanup()
  })

  it('creates a product without sending unsupported fields', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/products?ecosystemId=eco-1&activeOnly=false': { body: listResponse },
      '/api/ecosystem/admin/products': (url, init) => {
        if ((init?.method ?? 'GET') !== 'POST') return { status: 405 }
        return {
          status: 201,
          body: {
            id: 'prod-3',
            ecosystemId: 'eco-1',
            name: 'Té',
            priceAmount: 90,
            currency: 'ARS',
            deliverySupported: true,
            isActive: true,
            createdAt: '2026-03-13T12:10:00Z'
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/products')
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    const nameInput = inputs.find((input) => input.type === 'text' && input.placeholder !== 'ARS') as HTMLInputElement
    const priceInput = inputs.find((input) => input.getAttribute('placeholder') === '100.00') as HTMLInputElement
    const currencyInput = inputs.find((input) => input.getAttribute('placeholder') === 'ARS') as HTMLInputElement

    setInputValue(nameInput, 'Té')
    setInputValue(priceInput, '90')
    setInputValue(currencyInput, 'ARS')

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear producto'))
    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall).toBeTruthy()

    const payload = JSON.parse(String(postCall?.[1]?.body))
    expect(payload).toEqual({
      ecosystemId: 'eco-1',
      name: 'Té',
      priceAmount: 90,
      currency: 'ARS',
      deliverySupported: true,
      isActive: true
    })
    expect(payload).not.toHaveProperty('description')
    expect(document.body.textContent).toContain('Producto creado')

    await cleanup()
  })

  it('edits a product without sending unsupported fields', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/products?ecosystemId=eco-1&activeOnly=false': { body: listResponse },
      '/api/ecosystem/admin/products/prod-1?ecosystemId=eco-1': { body: listResponse[0] },
      '/api/ecosystem/admin/products/prod-1': (url, init) => {
        if ((init?.method ?? 'GET') !== 'PUT') return { status: 405 }
        return {
          body: {
            id: 'prod-1',
            ecosystemId: 'eco-1',
            name: 'Alfajor premium',
            priceAmount: 140,
            currency: 'ARS',
            deliverySupported: false,
            isActive: true,
            createdAt: '2026-03-13T12:00:00Z'
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/products')
    await flush()
    await flush()

    const editButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Editar')
    editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    const nameInput = inputs.find((input) => input.type === 'text' && input.placeholder !== 'ARS') as HTMLInputElement
    const priceInput = inputs.find((input) => input.getAttribute('placeholder') === '100.00') as HTMLInputElement

    setInputValue(nameInput, 'Alfajor premium')
    setInputValue(priceInput, '140')

    const selects = Array.from(document.querySelectorAll('select'))
    const deliverySelect = selects[1]
    setSelectValue(deliverySelect, 'false')

    const updateButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Actualizar'))
    updateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/ecosystem/admin/products/prod-1' && init?.method === 'PUT')
    expect(putCall).toBeTruthy()

    const payload = JSON.parse(String(putCall?.[1]?.body))
    expect(payload).toEqual({
      ecosystemId: 'eco-1',
      name: 'Alfajor premium',
      priceAmount: 140,
      currency: 'ARS',
      deliverySupported: false,
      isActive: true
    })
    expect(payload).not.toHaveProperty('description')
    expect(document.body.textContent).toContain('Producto actualizado')

    await cleanup()
  })

  it('deletes a product with confirmation', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/products?ecosystemId=eco-1&activeOnly=false': { body: listResponse },
      '/api/ecosystem/admin/products/prod-1?ecosystemId=eco-1': {
        body: {
          ...listResponse[0],
          isActive: false
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/products')
    await flush()
    await flush()

    const deleteButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Eliminar')
    deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    const confirmButton = Array.from(document.querySelectorAll('button'))
      .filter((button) => button.textContent === 'Eliminar')
      .at(-1)
    confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    const deleteCall = handler.mock.calls.find(([url, init]) => String(url) === '/api/ecosystem/admin/products/prod-1?ecosystemId=eco-1' && init?.method === 'DELETE')
    expect(deleteCall).toBeTruthy()
    expect(document.body.textContent).toContain('Producto eliminado')

    await cleanup()
  })

  it('shows backend errors visibly', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/ecosystem/admin/products?ecosystemId=eco-1&activeOnly=false': { body: listResponse },
      '/api/ecosystem/admin/products': {
        status: 409,
        body: {
          error: {
            code: 'product_conflict',
            message: 'product_conflict',
            status: 409
          }
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/ecosystem/products')
    await flush()
    await flush()

    const inputs = Array.from(document.querySelectorAll('input'))
    const nameInput = inputs.find((input) => input.type === 'text' && input.placeholder !== 'ARS') as HTMLInputElement
    const priceInput = inputs.find((input) => input.getAttribute('placeholder') === '100.00') as HTMLInputElement
    const currencyInput = inputs.find((input) => input.getAttribute('placeholder') === 'ARS') as HTMLInputElement

    setInputValue(nameInput, 'Té')
    setInputValue(priceInput, '90')
    setInputValue(currencyInput, 'ARS')

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear producto'))
    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    expect(document.body.textContent).toContain('product_conflict')

    await cleanup()
  })
})
