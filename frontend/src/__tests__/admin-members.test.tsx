import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin members store', () => {
  it('renders real store members list and creates a member through backend endpoints', async () => {
    const handler = mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: {
            stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
            ecosystems: []
          }
        }
      },
      '/api/store/members': (url, init) => {
        if ((init?.method ?? 'GET') === 'POST') {
          return {
            status: 201,
            body: {
              memberId: 'm2',
              storeId: 's1',
              storeSlug: 'demo-store',
              memberEmail: 'staff@example.com',
              role: 'STAFF',
              status: 'ACTIVE',
              createdAt: '2026-03-13T12:05:00Z'
            }
          }
        }

        return {
          body: [
            {
              memberId: 'm1',
              storeId: 's1',
              storeSlug: 'demo-store',
              memberEmail: 'owner@example.com',
              role: 'OWNER',
              status: 'ACTIVE',
              createdAt: '2026-03-13T12:00:00Z'
            }
          ]
        }
      }
    })

    const { cleanup } = await renderAppAt('/admin/members')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Store Members')
    expect(document.body.textContent).toContain('owner@example.com')
    expect(document.body.textContent).toContain('Invitar miembro')
    expect(document.body.textContent).not.toContain('no expone endpoints para listar miembros')

    const inviteButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Invitar miembro'))
    inviteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement | null
    expect(emailInput).not.toBeNull()
    if (emailInput) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(emailInput, 'staff')
      emailInput.dispatchEvent(new Event('input', { bubbles: true }))
      emailInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    const createButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Crear miembro'))
    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(document.body.textContent).toContain('Ingresá un email válido')
    const invalidPostCall = handler.mock.calls.find(([, init]) => {
      return (typeof init === 'object' && init !== null && 'method' in init && init.method === 'POST')
    })
    expect(invalidPostCall).toBeFalsy()

    if (emailInput) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(emailInput, 'staff@example.com')
      emailInput.dispatchEvent(new Event('input', { bubbles: true }))
      emailInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await flush()

    const postCall = handler.mock.calls.find(([, init]) => {
      return (typeof init === 'object' && init !== null && 'method' in init && init.method === 'POST')
    })
    expect(postCall).toBeTruthy()
    expect(String(postCall?.[0])).toContain('/api/store/members')
    expect(document.body.textContent).toContain('Miembro invitado')

    await cleanup()
  })
})
