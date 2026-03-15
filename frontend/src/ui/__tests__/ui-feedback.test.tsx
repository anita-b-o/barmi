import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '../components/ConfirmDialog'
import ToastContainer from '../components/ToastContainer'
import { clearStorage, flush, mockFetch, renderAppAt, setAuthSession } from '../../test-utils/testUtils'

async function renderComponent(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)

  await act(async () => {
    root.render(<React.StrictMode>{node}</React.StrictMode>)
  })

  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('ConfirmDialog', () => {
  it('renders only when open=true and handles actions', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    const { cleanup } = await renderComponent(
      <ConfirmDialog
        open={false}
        title="Confirmar"
        message="Mensaje"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    expect(document.body.textContent).not.toContain('Confirmar')

    await cleanup()

    const { cleanup: cleanupOpen } = await renderComponent(
      <ConfirmDialog
        open
        title="Eliminar"
        message="¿Seguro?"
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    expect(document.body.textContent).toContain('Eliminar')

    const cancelBtn = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Cancelar'))
    cancelBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalled()

    const confirmBtn = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Eliminar'))
    confirmBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onConfirm).toHaveBeenCalled()

    await cleanupOpen()
  })
})

describe('Toast', () => {
  it('renders toasts and auto-closes', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()

    const { cleanup } = await renderComponent(
      <ToastContainer
        toasts={[
          { id: 't1', message: 'Ok', variant: 'success' },
          { id: 't2', message: 'Error', variant: 'error' }
        ]}
        onClose={onClose}
      />
    )

    expect(document.body.textContent).toContain('Ok')
    expect(document.body.textContent).toContain('Error')

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(onClose).toHaveBeenCalledWith('t1')
    expect(onClose).toHaveBeenCalledWith('t2')

    await cleanup()
    vi.useRealTimers()
  })
})

describe('AdminStoreScreen delete integration', () => {
  beforeEach(() => {
    clearStorage()
    document.body.innerHTML = ''
    setAuthSession()
    mockFetch({
      '/api/auth/me': {
        body: {
          userId: 'u1',
          email: 'admin@example.com',
          memberships: { stores: [{ storeId: 's1', storeSlug: 'demo-store', role: 'OWNER', status: 'ACTIVE' }], ecosystems: [] }
        }
      },
      '/api/store/shipping/zones/': (url, init) => ({ status: init?.method === 'DELETE' ? 200 : 404, body: null }),
      '/api/store/shipping/zones': {
        body: [
          {
            zoneId: 'z1',
            storeId: 's1',
            type: 'EXACT',
            postalCode: '1900',
            rangeStart: null,
            rangeEnd: null,
            costAmount: 10,
            currency: 'ARS',
            createdAt: '2026-03-10T12:00:00.000Z'
          }
        ]
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('confirms delete and shows success toast', async () => {
    const { cleanup } = await renderAppAt('/admin/store')
    await flush()

    const deleteBtn = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Eliminar'))
    expect(deleteBtn).toBeTruthy()
    deleteBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(document.body.textContent).toContain('Eliminar zona')

    const confirmButtons = Array.from(document.querySelectorAll('button'))
      .filter((btn) => btn.textContent?.trim() === 'Eliminar')
    const confirmBtn = confirmButtons[confirmButtons.length - 1]
    confirmBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(document.body.textContent).toContain('Zona eliminada')

    await cleanup()
  })
})
