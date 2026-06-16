import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, setAuthSession, setInputElementValue, setTextAreaElementValue, waitForMs } from '../test-utils/testUtils'

const authMe = {
  userId: 'u1',
  email: 'admin@example.com',
  memberships: {
    stores: [{ storeId: 'store-1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }],
    ecosystems: []
  }
}

const publicProfile = {
  publicDescription: 'Cafetería de especialidad con atención de barrio.',
  publicEmail: 'hola@demo.test',
  publicPhone: '221 555 0101',
  publicWhatsapp: '+54 9 221 555 0101'
}

const readinessResponse = {
  score: 100,
  publishReady: true,
  completedSteps: ['store_profile', 'contact_info'],
  pendingSteps: [],
  blockers: [],
  enabledCapabilities: ['ABOUT', 'CONTACT'],
  steps: [
    { id: 'store_profile', capability: 'ABOUT', label: 'Perfil de tu sitio', ctaLabel: 'Revisar perfil', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true },
    { id: 'contact_info', capability: 'CONTACT', label: 'Contacto', ctaLabel: 'Gestionar contacto', ctaRoute: '/admin/store', required: true, blocksPublishing: true, implemented: true, completed: true }
  ]
}

beforeEach(() => {
  clearStorage()
  document.body.innerHTML = ''
  setAuthSession()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin store public profile screen', () => {
  it('renders the standalone public information form', async () => {
    mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/profile': { body: publicProfile }
    })

    const { cleanup } = await renderAppAt('/admin/store/profile')
    await flush()
    await flush()

    expect(document.body.textContent).toContain('Información pública')
    expect(document.body.textContent).toContain('Editá la información que ven tus clientes.')
    expect((document.querySelector('textarea[aria-label="Descripción de tu negocio"]') as HTMLTextAreaElement).value).toBe(publicProfile.publicDescription)
    expect((document.querySelector('input[aria-label="Email público"]') as HTMLInputElement).value).toBe(publicProfile.publicEmail)
    expect((document.querySelector('input[aria-label="Teléfono público"]') as HTMLInputElement).value).toBe(publicProfile.publicPhone)
    expect((document.querySelector('input[aria-label="WhatsApp"]') as HTMLInputElement).value).toBe(publicProfile.publicWhatsapp)

    await cleanup()
  })

  it('saves public information through the existing endpoint and reloads readiness', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/readiness': { body: readinessResponse },
      '/api/store/profile': (url, init) => {
        if (init?.method === 'PUT') {
          return {
            body: {
              publicDescription: 'Salón de cortes y color.',
              publicEmail: 'turnos@demo.test',
              publicPhone: '221 555 9999',
              publicWhatsapp: '+54 9 221 555 9999'
            }
          }
        }
        return { body: publicProfile }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/profile')
    await flush()
    await flush()

    await setTextAreaElementValue(document.querySelector('textarea[aria-label="Descripción de tu negocio"]') as HTMLTextAreaElement, 'Salón de cortes y color.')
    await setInputElementValue(document.querySelector('input[aria-label="Email público"]') as HTMLInputElement, 'turnos@demo.test')
    await setInputElementValue(document.querySelector('input[aria-label="Teléfono público"]') as HTMLInputElement, '221 555 9999')
    await setInputElementValue(document.querySelector('input[aria-label="WhatsApp"]') as HTMLInputElement, '+54 9 221 555 9999')
    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar información pública')))
    await flush()
    await flush()

    const putCall = handler.mock.calls.find(([url, init]) => String(url).includes('/api/store/profile') && init?.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(JSON.parse(String(putCall?.[1]?.body))).toMatchObject({
      publicDescription: 'Salón de cortes y color.',
      publicEmail: 'turnos@demo.test',
      publicPhone: '221 555 9999',
      publicWhatsapp: '+54 9 221 555 9999'
    })
    expect(handler.mock.calls.some(([url]) => String(url).includes('/api/store/readiness'))).toBe(true)
    expect(document.body.textContent).toContain('Información pública guardada.')

    await cleanup()
  })

  it('shows a save error without dropping the form', async () => {
    const handler = mockFetch({
      '/api/auth/me': { body: authMe },
      '/api/store/profile': (url, init) => {
        if (init?.method === 'PUT') return { status: 500, body: {} }
        return { body: publicProfile }
      }
    })

    const { cleanup } = await renderAppAt('/admin/store/profile')
    await flush()
    await flush()

    await setInputElementValue(document.querySelector('input[aria-label="Email público"]') as HTMLInputElement, 'error@demo.test')
    await clickElement(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar información pública')))
    await flush()
    await flush()
    await flush()
    await waitForMs(10)

    expect(handler.mock.calls.some(([url, init]) => String(url).includes('/api/store/profile') && init?.method === 'PUT')).toBe(true)
    expect(document.body.textContent).toContain('No se pudo guardar la información pública.')
    expect(document.querySelector('textarea[aria-label="Descripción de tu negocio"]')).toBeTruthy()

    await cleanup()
  })
})
