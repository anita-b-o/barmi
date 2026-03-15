import { describe, expect, it } from 'vitest'
import loginSample from '../_samples/auth.login.success.json'
import refreshSample from '../_samples/auth.refresh.success.json'
import meSample from '../_samples/auth.me.success.json'
import invalidCredentialsSample from '../_samples/auth.invalid_credentials.json'
import { parseAuthMe, parseAuthTokenResponse } from '../../../adapters/authAdapter'
import { isApiError } from '../../../client/errors'

describe('auth contracts parsing', () => {
  it('parses login response sample', () => {
    const res = parseAuthTokenResponse(loginSample)
    expect(res.accessToken).toContain('login')
    expect(res.tokenType).toBe('Bearer')
  })

  it('parses refresh response sample', () => {
    const res = parseAuthTokenResponse(refreshSample)
    expect(res.accessToken).toContain('refresh')
    expect(res.refreshToken).toContain('rt-')
  })

  it('parses me response sample', () => {
    const res = parseAuthMe(meSample)
    expect(res.userId).toBe('0d0e6b06-2b3d-4a8f-8f86-0f4e0a9d3b66')
    expect(res.memberships.stores[0].storeSlug).toBe('demo-store')
    expect(res.memberships.ecosystems[0].ecosystemSlug).toBe('demo-ecosystem')
  })

  it('recognizes invalid credentials error sample', () => {
    const envelope = invalidCredentialsSample as { error?: unknown }
    expect(isApiError(envelope.error)).toBe(true)
  })
})
