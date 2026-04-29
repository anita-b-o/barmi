import { afterEach, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  vi.restoreAllMocks()
})
