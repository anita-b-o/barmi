import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setInputElementValue } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [
      { storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }
    ],
    ecosystems: []
  }
}

const branding = {
  logoUrl: 'https://cdn.demo.test/logo.png',
  bannerUrl: 'https://cdn.demo.test/banner.jpg',
  primaryColor: '#0F766E',
  secondaryColor: '#155E75'
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store branding', () => {
  it('renders branding screen with a simple preview', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/branding': { body: branding }
    })

    const { cleanup } = await renderAppAt('/admin/store/branding')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Marca')
    expect(document.body.textContent).toContain('Personalizá tu marca')
    expect((document.querySelector('input[aria-label="URL logo"]') as HTMLInputElement).value).toBe(branding.logoUrl)
    expect((document.querySelector('input[aria-label="URL banner"]') as HTMLInputElement).value).toBe(branding.bannerUrl)
    expect((document.querySelector('input[aria-label="Color principal"]') as HTMLInputElement).value).toBe(branding.primaryColor)
    expect((document.querySelector('input[aria-label="Color secundario"]') as HTMLInputElement).value).toBe(branding.secondaryColor)
    expect(document.querySelector('img[src="https://cdn.demo.test/logo.png"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Botón principal')
    expect(document.body.textContent).toContain('Botón secundario')

    await cleanup()
  })

  it('saves branding payload and refreshes preview', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/branding': (url, init) => {
        if (init?.method === 'PUT') {
          return {
            body: {
              logoUrl: 'https://cdn.demo.test/new-logo.png',
              bannerUrl: null,
              primaryColor: '#7C3AED',
              secondaryColor: '#6D28D9'
            }
          }
        }
        return { body: branding }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/branding')
    await flush()
    await flush()

    await setInputElementValue(document.querySelector('input[aria-label="URL logo"]') as HTMLInputElement, 'https://cdn.demo.test/new-logo.png')
    await setInputElementValue(document.querySelector('input[aria-label="URL banner"]') as HTMLInputElement, '')
    await setInputElementValue(document.querySelector('input[aria-label="Color principal"]') as HTMLInputElement, '#7c3aed')
    await setInputElementValue(document.querySelector('input[aria-label="Color secundario"]') as HTMLInputElement, '#6d28d9')
    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar marca')))
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url).includes('/api/store/branding') && init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      logoUrl: 'https://cdn.demo.test/new-logo.png',
      bannerUrl: null,
      primaryColor: '#7C3AED',
      secondaryColor: '#6D28D9'
    })
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Marca guardada.')
    expect(document.querySelector('img[src="https://cdn.demo.test/new-logo.png"]')).toBeTruthy()

    await cleanup()
  })
})
