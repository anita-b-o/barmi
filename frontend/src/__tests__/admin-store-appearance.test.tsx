import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setSelectElementValue } from '../test-utils/testUtils'

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

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store appearance', () => {
  it('renders appearance presets in light and dark themes', async () => {
    for (const preference of ['light', 'dark'] as const) {
      document.body.innerHTML = ''
      window.localStorage.setItem('barmi-theme-mode', preference)
      mockFetch({
        '/api/auth/me': { body: authMe },
        '/api/store/appearance': { body: { preset: 'MODERN' } }
      })

      const { cleanup } = await renderAppAt('/admin/store/appearance')
      await flush()
      await flush()

      expect(document.documentElement.dataset.theme).toBe(preference)
      expect(document.body.textContent).toContain('Apariencia')
      expect(document.body.textContent).toContain('Moderna')
      expect(document.body.textContent).toContain('Clásica')
      expect(document.body.textContent).toContain('Negocio local')
      expect(document.body.textContent).toContain('Portfolio')
      expect(document.body.textContent).toContain('Elegí la forma general, la paleta cerrada y el nivel de redondez.')
      expect(document.querySelector('select[aria-label="Palette"]')).toBeTruthy()
      expect(document.querySelector('select[aria-label="Shape"]')).toBeTruthy()
      expect(document.querySelector('[data-storefront-palette="coral"]')).toBeTruthy()
      expect(document.querySelector('[data-storefront-shape="rounded"]')).toBeTruthy()
      const backLink = Array.from(document.querySelectorAll('a')).find((anchor) => anchor.textContent?.includes('Volver a publicar'))
      expect(backLink?.getAttribute('href')).toBe('/admin/store/publish')
      expect((document.querySelector('input[aria-label="Moderna"]') as HTMLInputElement).checked).toBe(true)

      await cleanup()
    }
  })

  it('saves selected appearance preset', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/appearance': (url, init) => {
        if ((init?.method ?? 'GET') === 'PUT') {
          return { body: { preset: 'LOCAL_BUSINESS', palette: 'OCEAN', shape: 'SOFT' } }
        }
        return { body: { preset: 'MODERN' } }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/appearance')
    await flush()
    await flush()

    await clickElement(document.querySelector('input[aria-label="Negocio local"]'))
    await setSelectElementValue(document.querySelector('select[aria-label="Palette"]') as HTMLSelectElement, 'OCEAN')
    await setSelectElementValue(document.querySelector('select[aria-label="Shape"]') as HTMLSelectElement, 'SOFT')
    const saveButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar apariencia'))
    await clickElement(saveButton)
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({ preset: 'LOCAL_BUSINESS', palette: 'OCEAN', shape: 'SOFT' })
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Apariencia guardada.')
    expect((document.querySelector('input[aria-label="Negocio local"]') as HTMLInputElement).checked).toBe(true)
    expect((document.querySelector('select[aria-label="Palette"]') as HTMLSelectElement).value).toBe('OCEAN')
    expect((document.querySelector('select[aria-label="Shape"]') as HTMLSelectElement).value).toBe('SOFT')

    await cleanup()
  })
})
