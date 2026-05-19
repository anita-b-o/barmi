import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlobalErrorBoundary } from '@/app/observability/GlobalErrorBoundary'
import { flush, renderWithProviders } from '../test-utils/testUtils'

function CrashyRoute(): React.ReactElement {
  throw Object.assign(new Error('route_crash'), { requestId: 'route-request-id' })
}

describe('GlobalErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a retry fallback instead of a white screen on render crashes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const { cleanup } = await renderWithProviders(
      <GlobalErrorBoundary>
        <CrashyRoute />
      </GlobalErrorBoundary>
    )

    await flush()

    expect(document.body.textContent).toContain('No pudimos cargar esta pantalla')
    expect(document.body.textContent).toContain('Release')
    expect(document.body.textContent).toContain('Reintentar')

    await cleanup()
  })
})
