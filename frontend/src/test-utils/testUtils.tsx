import React, { act } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { vi } from 'vitest'
import TestApp from './TestApp'
import { AppProviders } from '@/app/providers'

export type MockRoute =
  | { status?: number; body?: unknown; headers?: Record<string, string> }
  | ((url: string, init?: RequestInit) => { status?: number; body?: unknown; headers?: Record<string, string> })

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
    const noContent = status === 204 || status === 205 || status === 304
    return new Response(
      noContent ? null : body === undefined ? '' : JSON.stringify(body),
      {
        status,
        headers: response?.headers
      }
    )
  })

  globalThis.fetch = handler as unknown as typeof fetch
  return handler
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      },
      mutations: {
        retry: false
      }
    }
  })
}

export async function renderWithProviders(node: React.ReactElement, options?: { queryClient?: QueryClient; withStrictMode?: boolean }) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)

  await act(async () => {
    root.render(
      <AppProviders
        queryClient={options?.queryClient ?? createTestQueryClient()}
        withStrictMode={options?.withStrictMode ?? false}
      >
        {node}
      </AppProviders>
    )
    await Promise.resolve()
  })

  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
        await Promise.resolve()
      })
      container.remove()
    }
  }
}

export async function renderAppAt(path: string) {
  window.history.pushState({}, '', path)
  return renderWithProviders(<TestApp />)
}

export async function flush() {
  await act(async () => {
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

export async function waitForMs(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

export async function clickElement(element: Element | null | undefined) {
  if (!element) return
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

export async function setInputElementValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
  })
}

export async function setSelectElementValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
  })
}

export function setAuthSession() {
  window.localStorage.setItem('barmi.auth.session.v1', JSON.stringify({
    accessToken: 'test-token',
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
