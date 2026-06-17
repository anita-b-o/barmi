import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, selectFile, setAuthSession, setInputElementValue } from '../test-utils/testUtils'

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
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:preview')
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn()
  })
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
    expect(document.querySelector('input[aria-label="Seleccionar archivo logo"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="Seleccionar archivo banner"]')).toBeTruthy()
    expect((document.querySelector('input[aria-label="Color principal"]') as HTMLInputElement).value).toBe(branding.primaryColor)
    expect((document.querySelector('input[aria-label="Color secundario"]') as HTMLInputElement).value).toBe(branding.secondaryColor)
    expect(document.querySelector('img[src="https://cdn.demo.test/logo.png"]')).toBeTruthy()
    expect(document.querySelector('img[src="https://cdn.demo.test/banner.jpg"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Botón principal')
    expect(document.body.textContent).toContain('Botón secundario')

    await cleanup()
  })

  it('selects files, previews them, uploads successfully and saves returned urls', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/assets/logo': { body: { url: '/uploads/stores/s1/logo.png' } },
      '/api/store/assets/banner': { body: { url: '/uploads/stores/s1/banner.webp' } },
      '/api/store/branding': (url, init) => {
        if (init?.method === 'PUT') {
          return {
            body: {
              logoUrl: '/uploads/stores/s1/logo.png',
              bannerUrl: '/uploads/stores/s1/banner.webp',
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

    await selectFile(document.querySelector('input[aria-label="Seleccionar archivo logo"]') as HTMLInputElement, new File(['logo'], 'logo.png', { type: 'image/png' }))
    await selectFile(document.querySelector('input[aria-label="Seleccionar archivo banner"]') as HTMLInputElement, new File(['banner'], 'banner.webp', { type: 'image/webp' }))
    await setInputElementValue(document.querySelector('input[aria-label="Color principal"]') as HTMLInputElement, '#7c3aed')
    await setInputElementValue(document.querySelector('input[aria-label="Color secundario"]') as HTMLInputElement, '#6d28d9')
    expect(document.querySelectorAll('img[src="blob:preview"]').length).toBeGreaterThan(0)

    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar marca')))
    await flush()
    await flush()

    expect(handler.mock.calls.some(([url, init]) => String(url).includes('/api/store/assets/logo') && init?.method === 'POST' && init.body instanceof FormData)).toBe(true)
    expect(handler.mock.calls.some(([url, init]) => String(url).includes('/api/store/assets/banner') && init?.method === 'POST' && init.body instanceof FormData)).toBe(true)
    const putCall = handler.mock.calls.find(([url, init]) => String(url).includes('/api/store/branding') && init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      logoUrl: '/uploads/stores/s1/logo.png',
      bannerUrl: '/uploads/stores/s1/banner.webp',
      primaryColor: '#7C3AED',
      secondaryColor: '#6D28D9'
    })
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Marca guardada.')
    expect(document.querySelector('img[src="/uploads/stores/s1/logo.png"]')).toBeTruthy()

    await cleanup()
  })

  it('shows upload errors without saving branding', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/assets/logo': {
        status: 400,
        body: { error: { code: 'unsupported_image_type', message: 'Request failed', status: 400 } }
      },
      '/api/store/branding': { body: branding }
    })

    const { cleanup } = await renderAppAt('/admin/store/branding')
    await flush()
    await flush()

    await selectFile(document.querySelector('input[aria-label="Seleccionar archivo logo"]') as HTMLInputElement, new File(['gif'], 'logo.gif', { type: 'image/gif' }))
    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar marca')))
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Request failed')
    expect(handler.mock.calls.some(([url, init]) => String(url).includes('/api/store/branding') && init?.method === 'PUT')).toBe(false)

    await cleanup()
  })

  it('removes an existing image and saves null url', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/branding': (url, init) => {
        if (init?.method === 'PUT') {
          return { body: { ...branding, logoUrl: null } }
        }
        return { body: branding }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/branding')
    await flush()
    await flush()

    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Eliminar imagen')))
    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar marca')))
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url).includes('/api/store/branding') && init?.method === 'PUT')
    expect(JSON.parse(String(putCall?.[1]?.body)).logoUrl).toBeNull()

    await cleanup()
  })
})
