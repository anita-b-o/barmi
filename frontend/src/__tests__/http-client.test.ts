import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportObservabilityEvent } from '@/app/observability/client'
import { appConfig } from '@/app/config/env'
import { requestJson } from '@/api/client/http'

describe('requestJson', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('classifies offline failures explicitly', async () => {
    vi.stubGlobal('navigator', {
      onLine: false
    })

    await expect(
      requestJson('/api/test', {}, {
        fetchFn: async () => {
          throw new TypeError('Network down')
        }
      })
    ).rejects.toMatchObject({
      code: 'offline',
      status: 0
    })
  })

  it('propagates request id from error responses', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'bad_request',
          message: 'Bad request',
          status: 400
        }
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': 'backend-request-id'
        }
      }
    )

    await expect(
      requestJson('/api/test', {}, {
        fetchFn: async () => response
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
      requestId: 'backend-request-id',
      status: 400
    })
  })

  it('retries short backend unavailability before failing the view', async () => {
    vi.useFakeTimers()

    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          error: {
            code: 'backend_unavailable',
            message: 'Backend unavailable',
            status: 503
          }
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'backend-503-request-id'
          }
        }
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ ok: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'backend-recovered-request-id'
          }
        }
      ))

    const request = requestJson<{ ok: boolean }>('/api/test', {}, { fetchFn })
    await vi.advanceTimersByTimeAsync(300)

    await expect(request).resolves.toEqual({ ok: true })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('does not retry transient failures for POST by default', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        error: {
          code: 'backend_unavailable',
          message: 'Backend unavailable',
          status: 503
        }
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': 'backend-503-request-id'
        }
      }
    ))

    await expect(requestJson('/api/store/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: [{ productId: 'p1', qty: 1 }] })
    }, { fetchFn })).rejects.toMatchObject({
      status: 503
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('allows explicit transient retry override for POST flows that are safe to replay', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {
      onLine: true
    })

    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new TypeError('socket hang up'))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ accessToken: 'token', tokenType: 'Bearer', expiresAt: '2026-05-18T00:00:00Z' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'backend-refresh-request-id'
          }
        }
      ))

    const request = requestJson('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    }, {
      fetchFn,
      transientRetry: 'always'
    })

    await vi.advanceTimersByTimeAsync(300)

    await expect(request).resolves.toMatchObject({
      accessToken: 'token'
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('reuses the latest backend request id for later frontend observability events', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const previousEnv = appConfig.appEnv
    ;(appConfig as { appEnv: string }).appEnv = 'local'

    await requestJson('/api/test', {}, {
      fetchFn: async () => new Response(
        JSON.stringify({ ok: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'backend-ok-request-id'
          }
        }
      )
    })

    reportObservabilityEvent({
      type: 'runtime_error',
      level: 'error',
      message: 'frontend-only-followup'
    })

    expect(errorSpy).toHaveBeenCalledWith(
      '[observability]',
      expect.objectContaining({
        payload: expect.objectContaining({
          requestId: 'backend-ok-request-id'
        })
      })
    )

    ;(appConfig as { appEnv: string }).appEnv = previousEnv
  })
})
