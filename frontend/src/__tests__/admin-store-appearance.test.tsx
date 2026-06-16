import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession } from '../test-utils/testUtils'

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
      expect(document.body.textContent).toContain('Preview textual')
      expect((document.querySelector('input[aria-label="Moderna"]') as HTMLInputElement).checked).toBe(true)

      await cleanup()
    }
  })

  it('saves selected appearance preset', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/appearance': (url, init) => {
        if ((init?.method ?? 'GET') === 'PUT') {
          return { body: { preset: 'LOCAL_BUSINESS' } }
        }
        return { body: { preset: 'MODERN' } }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/appearance')
    await flush()
    await flush()

    await clickElement(document.querySelector('input[aria-label="Negocio local"]'))
    const saveButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar apariencia'))
    await clickElement(saveButton)
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({ preset: 'LOCAL_BUSINESS' })
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Apariencia guardada.')
    expect((document.querySelector('input[aria-label="Negocio local"]') as HTMLInputElement).checked).toBe(true)

    await cleanup()
  })
})
