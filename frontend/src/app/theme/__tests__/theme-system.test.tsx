import React, { act } from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, ThemeProvider, ThemeToggle, useTheme } from '@/app/theme'

type MatchMediaController = {
  setMatches: (matches: boolean) => void
}

function installMatchMedia(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      dispatchEvent: () => true
    }))
  })

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent))
    }
  }
}

function ThemeProbe() {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme()

  return (
    <div>
      <div data-testid="preference">{themePreference}</div>
      <div data-testid="resolved">{resolvedTheme}</div>
      <button type="button" onClick={() => setThemePreference('system')}>Set system</button>
      <button type="button" onClick={() => setThemePreference('light')}>Set light</button>
      <button type="button" onClick={() => setThemePreference('dark')}>Set dark</button>
    </div>
  )
}

async function renderTheme(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)

  await act(async () => {
    root.render(<ThemeProvider>{node}</ThemeProvider>)
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

async function clickButton(button: Element | null | undefined) {
  if (!button) throw new Error('button not found')
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

function text(container: HTMLElement, testId: string) {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('Barmi theme system', () => {
  it('defaults to system preference and resolves light by default', async () => {
    installMatchMedia(false)

    const { container, cleanup } = await renderTheme(<ThemeProbe />)

    expect(text(container, 'preference')).toBe('system')
    expect(text(container, 'resolved')).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('light')

    await cleanup()
  })

  it('respects prefers-color-scheme while preference is system', async () => {
    const media = installMatchMedia(true)

    const { container, cleanup } = await renderTheme(<ThemeProbe />)

    expect(text(container, 'resolved')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await act(async () => {
      media.setMatches(false)
      await Promise.resolve()
    })

    expect(text(container, 'resolved')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    await cleanup()
  })

  it('persists light, dark, and system preferences and updates data-theme', async () => {
    installMatchMedia(true)

    const { container, cleanup } = await renderTheme(<ThemeProbe />)

    await clickButton(Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Set light'))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(text(container, 'resolved')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    await clickButton(Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Set dark'))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(text(container, 'resolved')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await clickButton(Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Set system'))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
    expect(text(container, 'resolved')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await cleanup()
  })

  it('ThemeToggle changes the stored preference accessibly', async () => {
    installMatchMedia(false)

    const { container, cleanup } = await renderTheme(
      <>
        <ThemeToggle />
        <ThemeProbe />
      </>
    )

    expect(container.querySelector('[role="radiogroup"]')).toBeTruthy()
    await clickButton(container.querySelector('button[aria-label="Usar tema oscuro"]'))

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(text(container, 'preference')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await cleanup()
  })
})
