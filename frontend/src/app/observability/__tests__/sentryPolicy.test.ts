import { afterEach, describe, expect, it } from 'vitest'
import { appConfig } from '@/app/config/env'
import {
  deriveSentryContextFromLocation,
  redactSensitiveString,
  sanitizeForSentry,
  sanitizeSentryEvent,
  sanitizeUrlForTelemetry,
  shouldDropSentryEvent
} from '../sentryPolicy'

describe('sentryPolicy', () => {
  const previousEnv = appConfig.appEnv
  const previousReleaseId = appConfig.appReleaseId
  const previousEcosystemSlug = appConfig.publicEcosystemSlug
  const previousSentrySmokeEnabled = appConfig.sentrySmokeEnabled

  afterEach(() => {
    ;(appConfig as { appEnv: string }).appEnv = previousEnv
    ;(appConfig as { appReleaseId: string }).appReleaseId = previousReleaseId
    ;(appConfig as { publicEcosystemSlug: string }).publicEcosystemSlug = previousEcosystemSlug
    ;(appConfig as { sentrySmokeEnabled: boolean }).sentrySmokeEnabled = previousSentrySmokeEnabled
  })

  it('redacts sensitive token-like values and query params', () => {
    expect(redactSensitiveString('Authorization: Bearer abc.def.ghi')).toContain('Bearer [Filtered]')
    expect(redactSensitiveString('https://example.test/callback?access_token=secret-token')).toContain('access_token=[Filtered]')
    expect(redactSensitiveString('jwt eyJabc.eyJdef.sig')).toContain('[Filtered]')
  })

  it('sanitizes sensitive object keys recursively', () => {
    expect(sanitizeForSentry({
      headers: {
        Authorization: 'Bearer secret',
        'X-Request-Id': 'request-1'
      },
      body: {
        refreshToken: 'refresh-secret',
        publicValue: 'ok'
      }
    })).toEqual({
      headers: {
        Authorization: '[Filtered]',
        'X-Request-Id': 'request-1'
      },
      body: {
        refreshToken: '[Filtered]',
        publicValue: 'ok'
      }
    })
  })

  it('drops query strings from telemetry urls', () => {
    expect(sanitizeUrlForTelemetry('https://store.example.test/public/demo?token=secret#fragment'))
      .toBe('https://store.example.test/public/demo')
  })

  it('derives safe route and tenant tags without backend coupling', () => {
    ;(appConfig as { appEnv: string }).appEnv = 'staging'
    ;(appConfig as { appReleaseId: string }).appReleaseId = '2026.05.27+abc123'
    ;(appConfig as { publicEcosystemSlug: string }).publicEcosystemSlug = 'demo-ecosystem'

    expect(deriveSentryContextFromLocation({
      hostname: 'store-one.example.test',
      pathname: '/store/checkout'
    })).toEqual({
      route: '/store/checkout',
      tags: {
        app_env: 'staging',
        release_id: '2026.05.27+abc123',
        store_slug: 'store-one'
      }
    })

    expect(deriveSentryContextFromLocation({
      hostname: 'example.test',
      pathname: '/ecosystem/checkout'
    }).tags).toMatchObject({
      ecosystem_slug: 'demo-ecosystem'
    })
  })

  it('suppresses observability smoke events unless explicitly enabled', () => {
    ;(appConfig as { sentrySmokeEnabled: boolean }).sentrySmokeEnabled = false
    expect(shouldDropSentryEvent('/__observability')).toBe(true)

    ;(appConfig as { sentrySmokeEnabled: boolean }).sentrySmokeEnabled = true
    expect(shouldDropSentryEvent('/__observability')).toBe(false)
  })

  it('sanitizes Sentry event request and context fields', () => {
    expect(sanitizeSentryEvent({
      request: {
        url: 'https://example.test/store/checkout?token=secret',
        headers: {
          Cookie: 'session=secret',
          'X-Request-Id': 'request-1'
        }
      },
      contexts: {
        auth: {
          accessToken: 'secret'
        }
      }
    })).toEqual({
      request: {
        url: 'https://example.test/store/checkout',
        headers: {
          Cookie: '[Filtered]',
          'X-Request-Id': 'request-1'
        },
        query_string: undefined
      },
      contexts: {
        auth: {
          accessToken: '[Filtered]'
        }
      }
    })
  })
})
