import React, { act } from 'react'
import ReactDOM from 'react-dom/client'
import { vi } from 'vitest'
import App from '../app/App'
import { AppProviders } from '../app/providers'

export type MockRoute =
  | { status?: number; body?: unknown }
  | ((url: string, init?: RequestInit) => { status?: number; body?: unknown })

export function mockFetch(routes: Record<string, MockRoute>) {
  const handler = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const matchKey = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((key) => url.startsWith(key))
    const resolved = matchKey ? routes[matchKey] : undefined
    const response = typeof resolved === 'function' ? resolved(url, init) : resolved
    const status = response?.status ?? (resolved ? 200 : 404)
    const body = response?.body
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body))
    } as Response
  })

  globalThis.fetch = handler as unknown as typeof fetch
  return handler
}

export async function renderAppAt(path: string) {
  window.history.pushState({}, '', path)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)

  await act(async () => {
    root.render(
      <AppProviders>
        <App />
      </AppProviders>
    )
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

export async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

export function setAuthSession() {
  window.localStorage.setItem('barmi.auth.session.v1', JSON.stringify({
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    tokenType: 'Bearer',
    expiresAt: '2026-03-10T12:00:00.000Z'
  }))
}

export function setStoreCart() {
  window.localStorage.setItem('barmi.cart.v1', JSON.stringify({
    storeSlug: 'demo-store',
    items: [
      { productId: 'p1', name: 'Producto 1', priceCents: 1000, qty: 1 }
    ]
  }))
}

export function setEcosystemCart() {
  window.localStorage.setItem('barmi.ecosystemCart.v1', JSON.stringify({
    items: [
      { externalProductId: 'e1', name: 'Producto Eco', unitPriceAmount: 120, qty: 1, currency: 'ARS', deliverySupported: true }
    ]
  }))
}

export function clearStorage() {
  window.localStorage.clear()
}
