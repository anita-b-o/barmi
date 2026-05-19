import { afterEach, vi } from 'vitest'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true
window.scrollTo = ((..._args: unknown[]) => undefined) as typeof window.scrollTo

afterEach(() => {
  vi.restoreAllMocks()
})
