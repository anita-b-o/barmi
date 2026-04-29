import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '@/components/primitives/Modal/ConfirmDialog'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import ToastContainer from '@/components/feedback/ToastContainer'
import { act } from 'react'
import { clearStorage, clickElement, flush, mockFetch, renderAppAt, renderWithProviders, setAuthSession } from '../test-utils/testUtils'

describe('ConfirmDialog', () => {
  it('renders only when open=true and handles actions', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    const { cleanup } = await renderWithProviders(
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

    const { cleanup: cleanupOpen } = await renderWithProviders(
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
    await clickElement(cancelBtn)
    expect(onCancel).toHaveBeenCalled()

    const confirmBtn = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Eliminar'))
    await clickElement(confirmBtn)
    expect(onConfirm).toHaveBeenCalled()

    await cleanupOpen()
  })
})

describe('Toast', () => {
  it('renders toasts and auto-closes', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()

    const { cleanup } = await renderWithProviders(
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

describe('feedback actions', () => {
  it('supports optional recovery actions in error and empty states', async () => {
    const onRetry = vi.fn()
    const onReload = vi.fn()

    const { cleanup } = await renderWithProviders(
      <>
        <ErrorAlert message="Algo salió mal" actionLabel="Reintentar" onAction={onRetry} />
        <EmptyState title="Sin resultados" description="Probá otra búsqueda." actionLabel="Recargar" onAction={onReload} />
      </>
    )

    const retryButton = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent?.includes('Reintentar'))
    const reloadButton = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent?.includes('Recargar'))

    await clickElement(retryButton)
    await clickElement(reloadButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onReload).toHaveBeenCalledTimes(1)

    await cleanup()
  })
})

describe('AdminStoreShippingZonesScreen delete integration', () => {
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
    const { cleanup } = await renderAppAt('/admin/shipping/zones')
    await flush()

    const deleteBtn = Array.from(document.querySelectorAll('button'))
      .find((btn) => btn.textContent?.includes('Eliminar'))
    expect(deleteBtn).toBeTruthy()
    await clickElement(deleteBtn)
    await flush()

    expect(document.body.textContent).toContain('Eliminar zona')

    const confirmButtons = Array.from(document.querySelectorAll('button'))
      .filter((btn) => btn.textContent?.trim() === 'Eliminar')
    const confirmBtn = confirmButtons[confirmButtons.length - 1]
    await clickElement(confirmBtn)
    await flush()

    expect(document.body.textContent).toContain('Zona eliminada')

    await cleanup()
  })
})
